// src/modules/upload/upload.controller.ts - UPDATED WITH TAG & BANNER ENDPOINTS
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
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Avatar uploaded successfully',
  })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @Req() request: FastifyRequest,
  ) {
    try {
      const data = await (request as any).file();
      if (!data) throw new BadRequestException('No file uploaded');

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
      if (error instanceof BadRequestException) throw error;
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
  })
  async uploadPostImage(
    @CurrentUser('id') userId: string,
    @Req() request: FastifyRequest,
  ) {
    try {
      const data = await (request as any).file();
      if (!data) throw new BadRequestException('No file uploaded');

      const buffer = await data.toBuffer();
      this.uploadService.validateFileBuffer(buffer, data.mimetype, data.filename);

      const result = await this.uploadService.uploadPostImage(buffer, data.filename);
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
      if (error instanceof BadRequestException) throw error;
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
        file: { type: 'string', format: 'binary' },
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
      if (!data) throw new BadRequestException('No file uploaded');

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
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  // NEW: Upload tag image
  @Post('tag-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload tag image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Tag image file (max 10MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tag image uploaded successfully',
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
  async uploadTagImage(
    @CurrentUser('id') userId: string,
    @Req() request: FastifyRequest,
  ) {
    try {
      const data = await (request as any).file();
      if (!data) throw new BadRequestException('No file uploaded');

      const buffer = await data.toBuffer();
      this.uploadService.validateFileBuffer(buffer, data.mimetype, data.filename);

      const result = await this.uploadService.uploadTagImage(buffer, data.filename);

      return {
        message: 'Tag image uploaded successfully',
        url: result.url,
        filename: result.filename,
        width: result.width,
        height: result.height,
        size: result.size,
      };
    } catch (error) {
      console.error('Tag image upload error:', error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  // NEW: Upload single banner image
  @Post('banner-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload single banner image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Banner image file (max 10MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Banner image uploaded successfully',
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
  async uploadBannerImage(
    @CurrentUser('id') userId: string,
    @Req() request: FastifyRequest,
  ) {
    try {
      const data = await (request as any).file();
      if (!data) throw new BadRequestException('No file uploaded');

      const buffer = await data.toBuffer();
      this.uploadService.validateFileBuffer(buffer, data.mimetype, data.filename);

      const result = await this.uploadService.uploadBannerImage(buffer, data.filename);
      const responsiveUrls = this.uploadService.generateResponsiveImageUrls(result.url);

      return {
        message: 'Banner image uploaded successfully',
        url: result.url,
        filename: result.filename,
        width: result.width,
        height: result.height,
        size: result.size,
        responsive: responsiveUrls,
      };
    } catch (error) {
      console.error('Banner image upload error:', error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  // NEW: Upload multiple banner images
  @Post('banner-images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload multiple banner images',
    description: 'Upload multiple images for banners (up to 10 files)'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Multiple banner image files (max 10MB each)',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Banner images uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        uploadedCount: { type: 'number' },
        totalFiles: { type: 'number' },
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              filename: { type: 'string' },
              width: { type: 'number' },
              height: { type: 'number' },
              size: { type: 'number' },
              order: { type: 'number' },
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
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              index: { type: 'number' },
              filename: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async uploadMultipleBannerImages(
    @CurrentUser('id') userId: string,
    @Req() request: FastifyRequest,
  ) {
    try {
      const files = await (request as any).files();
      const uploadedImages: any[] = [];
      const errors: any[] = [];
      const maxFiles = 10;

      if (!files || files.length === 0) {
        throw new BadRequestException('No files uploaded');
      }

      if (files.length > maxFiles) {
        throw new BadRequestException(`Maximum ${maxFiles} files allowed`);
      }

      console.log(`📄 Processing ${files.length} banner images...`);

      for (let i = 0; i < files.length; i++) {
        try {
          const fileData = files[i];
          const buffer = await fileData.toBuffer();

          // Validate each file
          this.uploadService.validateFileBuffer(buffer, fileData.mimetype, fileData.filename);

          // Upload file
          const result = await this.uploadService.uploadBannerImage(
            buffer,
            fileData.filename || `banner-${i + 1}`
          );

          // Generate responsive URLs
          const responsiveUrls = this.uploadService.generateResponsiveImageUrls(result.url);

          uploadedImages.push({
            url: result.url,
            filename: result.filename,
            width: result.width,
            height: result.height,
            size: result.size,
            order: i,
            responsive: responsiveUrls,
          });

          console.log(`✅ Uploaded banner image ${i + 1}: ${result.filename}`);
        } catch (error) {
          console.error(`❌ Error uploading file ${i + 1}:`, error);
          errors.push({
            index: i,
            filename: files[i]?.filename || `file-${i + 1}`,
            error: error.message,
          });
        }
      }

      return {
        message: `Banner images uploaded successfully`,
        uploadedCount: uploadedImages.length,
        totalFiles: files.length,
        images: uploadedImages,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Multiple banner images upload error:', error);
      if (error instanceof BadRequestException) throw error;
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
        file: { type: 'string', format: 'binary' },
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
      if (!data) throw new BadRequestException('No file uploaded');

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
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }
}