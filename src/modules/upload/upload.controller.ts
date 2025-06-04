// src/modules/upload/upload.controller.ts - FIXED VERSION
import {
  Controller,
  Post,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
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

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
        message: { type: 'string' },
        url: { type: 'string' },
        filename: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' },
        size: { type: 'number' },
      },
    },
  })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @Req() request: FastifyRequest,
  ) {
    try {
      const data = await (request as any).file();

      if (!data) {
        throw new BadRequestException('No file uploaded');
      }

      const buffer = await data.toBuffer();
      this.uploadService.validateFileBuffer(buffer, data.mimetype, data.filename);

      const result = await this.uploadService.uploadAvatar(buffer, data.filename);

      return {
        message: 'Avatar uploaded successfully',
        url: result.url,
        filename: result.filename,
        width: result.width,
        height: result.height,
        size: result.size,
      };
    } catch (error) {
      console.error('Avatar upload error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
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
        filename: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' },
        size: { type: 'number' },
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
      this.uploadService.validateFileBuffer(buffer, data.mimetype, data.filename);

      const result = await this.uploadService.uploadPostImage(buffer, data.filename);

      // Generate responsive URLs
      const responsiveUrls = this.uploadService.generateResponsiveImageUrls(result.url);

      return {
        message: 'Post image uploaded successfully',
        url: result.url,
        filename: result.filename,
        width: result.width,
        height: result.height,
        size: result.size,
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
    @CurrentUser('id') userId: string,
    @Req() request: FastifyRequest,
  ) {
    try {
      const data = await (request as any).file();

      if (!data) {
        throw new BadRequestException('No file uploaded');
      }

      const buffer = await data.toBuffer();
      this.uploadService.validateFileBuffer(buffer, data.mimetype, data.filename);

      const result = await this.uploadService.uploadCategoryIcon(buffer, data.filename);

      return {
        message: 'Category icon uploaded successfully',
        url: result.url,
        filename: result.filename,
        width: result.width,
        height: result.height,
        size: result.size,
      };
    } catch (error) {
      console.error('Category icon upload error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  @Post('editor-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
    @CurrentUser('id') userId: string,
    @Req() request: FastifyRequest,
  ) {
    try {
      const data = await (request as any).file();

      if (!data) {
        throw new BadRequestException('No file uploaded');
      }

      const buffer = await data.toBuffer();
      this.uploadService.validateFileBuffer(buffer, data.mimetype, data.filename);

      const result = await this.uploadService.uploadEditorImage(buffer, data.filename);

      return {
        message: 'Editor image uploaded successfully',
        url: result.url,
        filename: result.filename,
        width: result.width,
        height: result.height,
        size: result.size,
      };
    } catch (error) {
      console.error('Editor image upload error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  // REMOVED: serveFile routes - let @fastify/static handle this
}