import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Body,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadService } from './upload.service';
import { FastifyRequest } from 'fastify';

interface FastifyMultipartFile {
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  file: NodeJS.ReadableStream;
  toBuffer(): Promise<Buffer>;
}

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Avatar uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        publicId: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' },
      },
    },
  })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadService.uploadAvatar(file.buffer);

    return {
      message: 'Avatar uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  }

  @Post('post-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload post featured image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Post image file (max 10MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Post image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        url: { type: 'string' },
        publicId: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' },
        responsive: {
          type: 'object',
          properties: {
            small: { type: 'string' },
            medium: { type: 'string' },
            large: { type: 'string' },
            original: { type: 'string' },
          },
        },
      },
    },
  })
  async uploadPostImage(
    @CurrentUser('id') userId: string,
    @Req() request: FastifyRequest,
  ) {
    try {
      const data = await (request as any).file();

      if (!data) {
        throw new BadRequestException('No file uploaded');
      }

      const buffer = await data.toBuffer();

      // Validate file\
      this.validateFile(data, buffer);

      const result = await this.uploadService.uploadPostImage(buffer);

      // Generate responsive URLs
      const responsiveUrls = this.uploadService.generateResponsiveImageUrls(
        result.public_id,
      );

      return {
        message: 'Post image uploaded successfully',
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        responsive: responsiveUrls,
      };
    } catch (error) {
      console.error('Post image upload error:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  @Post('category-icon')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload category icon' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Category icon uploaded successfully',
  })
  async uploadCategoryIcon(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadService.uploadCategoryIcon(file.buffer);

    return {
      message: 'Category icon uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  }

  @Post('editor-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload image for rich text editor' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Editor image uploaded successfully',
  })
  async uploadEditorImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadService.uploadImage(
      file.buffer,
      'forum/editor',
      {
        width: 1000,
        quality: 80,
        format: 'webp',
      },
    );

    return {
      message: 'Editor image uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  }

  private validateFile(file: FastifyMultipartFile, buffer: Buffer): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (buffer.length > maxSize) {
      throw new BadRequestException(
        `File size too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
      );
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    if (!file.filename) {
      throw new BadRequestException('File must have a filename');
    }

    // Additional validation for image files
    if (!file.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      throw new BadRequestException('File must have a valid image extension');
    }
  }
}
