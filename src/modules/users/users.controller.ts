// src/modules/users/users.controller.ts - FIXED VERSION
import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UploadedFile,
  BadRequestException,
  Post,
  UseInterceptors,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('profile/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload/Update user avatar',
    description:
      'Upload a new avatar image. Replaces existing avatar if present.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Avatar image file',
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description:
            'Avatar image file (max 10MB, formats: jpg, png, gif, webp)',
        },
      },
      required: ['avatar'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        avatar: { type: 'string', description: 'New avatar URL' },
        user: { type: 'object', description: 'Updated user object' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or validation error' })
  @ApiResponse({ status: 500, description: 'Upload service error' })
  async updateAvatar(
    @CurrentUser('id') userId: string,
    @Request() request: any,
  ) {
    try {
      console.log('🔍 Avatar upload debug:');
      console.log('- User ID:', userId);
      console.log('- Request type:', typeof request);
      console.log('- Has file method:', typeof request.file);
      console.log('- Has files method:', typeof request.files);

      // Handle Fastify multipart
      let fileData: any = null;

      // Method 1: Check if file is already parsed (by @fastify/multipart)
      if (request.file && typeof request.file === 'function') {
        console.log('📄 Using request.file() method');
        fileData = await request.file();
      }
      // Method 2: Check if files array exists
      else if (request.files && request.files.avatar) {
        console.log('📄 Using request.files.avatar');
        fileData = request.files.avatar;
      }
      // Method 3: Check body for file data
      else if (request.body && request.body.avatar) {
        console.log('📄 Using request.body.avatar');
        fileData = request.body.avatar;
      }
      // Method 4: Try to get file manually
      else {
        console.log('📄 Trying manual file parsing...');
        try {
          const data = await request.file();
          fileData = data;
        } catch (parseError) {
          console.error('❌ File parsing error:', parseError.message);
        }
      }

      if (!fileData) {
        throw new BadRequestException(
          'No avatar file uploaded. Make sure field name is "avatar"',
        );
      }

      console.log('📄 File data received:', {
        filename: fileData.filename,
        mimetype: fileData.mimetype,
        fieldname: fileData.fieldname,
        hasBuffer: !!fileData.buffer,
        hasToBuffer: typeof fileData.toBuffer,
      });

      // Convert file to buffer
      let fileBuffer: Buffer;

      if (fileData.buffer) {
        fileBuffer = fileData.buffer;
      } else if (fileData.toBuffer && typeof fileData.toBuffer === 'function') {
        fileBuffer = await fileData.toBuffer();
      } else if (fileData._buf) {
        fileBuffer = fileData._buf;
      } else {
        throw new BadRequestException('Unable to extract file buffer');
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        throw new BadRequestException('File buffer is empty');
      }

      // Validate file type and size
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      if (!allowedTypes.includes(fileData.mimetype)) {
        throw new BadRequestException(
          `Invalid file type: ${fileData.mimetype}. Allowed: ${allowedTypes.join(', ')}`,
        );
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileBuffer.length > maxSize) {
        throw new BadRequestException(
          `File too large: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB. Maximum: ${maxSize / 1024 / 1024}MB`,
        );
      }

      console.log('✅ File validation passed');
      console.log('📤 File details:', {
        size: `${(fileBuffer.length / 1024).toFixed(2)}KB`,
        type: fileData.mimetype,
        name: fileData.filename,
      });

      console.log('🔄 Calling usersService.updateAvatar...');
      const user = await this.usersService.updateAvatar(userId, fileBuffer);
      console.log('✅ Avatar updated successfully');

      return {
        message: 'Avatar updated successfully',
        avatar: user.avatar,
        user: {
          id: user._id,
          username: user.username,
          avatar: user.avatar,
          displayName: user.displayName,
        },
      };
    } catch (error) {
      console.error('❌ Avatar upload error:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      // Log detailed error for debugging
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.constructor.name,
      });

      throw new InternalServerErrorException(
        `Avatar upload failed: ${error.message || 'Unknown error'}`,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: [UserResponseDto],
  })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get('top')
  @ApiOperation({ summary: 'Get top users by post count' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of users to return',
  })
  @ApiResponse({ status: 200, description: 'Top users retrieved successfully' })
  getTopUsers(@Query('limit') limit?: number) {
    return this.usersService.getTopUsers(
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  @Get('profile/posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user posts' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'User posts retrieved successfully',
  })
  getMyPosts(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getUserPosts(
      userId,
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get('profile/activities')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user activities' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'User activities retrieved successfully',
  })
  getMyActivities(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getUserActivity(
      userId,
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 20,
    );
  }

  @Get('profile/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user statistics' })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
  })
  getMyStats(@CurrentUser('id') userId: string) {
    return this.usersService.getUserStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get('username/:username')
  @ApiOperation({ summary: 'Get user by username' })
  @ApiParam({ name: 'username', description: 'Username' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  findByUsername(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }

  @Get(':id/posts')
  @ApiOperation({ summary: 'Get user posts by user ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'User posts retrieved successfully',
  })
  getUserPosts(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getUserPosts(
      id,
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get('username/:username/posts')
  @ApiOperation({ summary: 'Get user posts by username' })
  @ApiParam({ name: 'username', description: 'Username' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'User posts retrieved successfully',
  })
  async getUserPostsByUsername(
    @Param('username') username: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const user = await this.usersService.findByUsername(username);
    return this.usersService.getUserPosts(
      user._id.toString(),
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get user statistics by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
  })
  getUserStats(@Param('id') id: string) {
    return this.usersService.getUserStats(id);
  }

  @Get('username/:username/stats')
  @ApiOperation({ summary: 'Get user statistics by username' })
  @ApiParam({ name: 'username', description: 'Username' })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
  })
  async getUserStatsByUsername(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username);
    return this.usersService.getUserStats(user._id.toString());
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    // TODO: Add admin role guard
    return this.usersService.remove(id);
  }
}
