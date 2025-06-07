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
    summary: 'Upload multiple banner images - FINAL FIX',
    description: 'Upload multiple images for banners. Use field name "files" for multiple files.'
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
          description: 'Multiple banner image files',
        },
      },
    },
  })
  async uploadMultipleBannerImages(
    @CurrentUser('id') userId: string,
    @Req() request: FastifyRequest,
  ) {
    try {
      console.log('🚀 FINAL FIX: Starting multiple banner upload...');

      const uploadedImages: any[] = [];
      const errors: any[] = [];

      // Log request details for debugging
      console.log('🔍 Request details:', {
        contentType: request.headers['content-type'],
        hasFilesMethod: typeof (request as any).files === 'function',
        hasFileMethod: typeof (request as any).file === 'function',
        bodyKeys: Object.keys((request as any).body || {}),
      });

      // Method 1: Try manual iteration with proper error handling
      let filesProcessed = false;

      try {
        console.log('📁 Method 1: Using files() generator...');
        const filesIterator = (request as any).files();

        if (!filesIterator) {
          throw new Error('Files iterator is null/undefined');
        }

        let fileCount = 0;

        // Use for-await-of loop with timeout protection
        const startTime = Date.now();
        const timeout = 30000; // 30 seconds timeout

        for await (const part of filesIterator) {
          // Timeout protection
          if (Date.now() - startTime > timeout) {
            console.error('⏰ Timeout reached while processing files');
            break;
          }

          fileCount++;
          console.log(`📄 Processing file ${fileCount}:`, {
            filename: part.filename,
            fieldname: part.fieldname,
            mimetype: part.mimetype,
            encoding: part.encoding,
          });

          try {
            // Convert stream to buffer with error handling
            const chunks: Buffer[] = [];
            const stream = part.file;

            // Method A: Use toBuffer if available
            let buffer: Buffer;
            if (typeof part.toBuffer === 'function') {
              console.log(`🔄 Using toBuffer() for file ${fileCount}`);
              buffer = await part.toBuffer();
            } else {
              // Method B: Manual stream reading
              console.log(`🔄 Reading stream manually for file ${fileCount}`);

              await new Promise<void>((resolve, reject) => {
                stream.on('data', (chunk: Buffer) => {
                  chunks.push(chunk);
                });

                stream.on('end', () => {
                  resolve();
                });

                stream.on('error', (err: Error) => {
                  reject(err);
                });

                // Add timeout for stream reading
                setTimeout(() => {
                  reject(new Error('Stream reading timeout'));
                }, 10000);
              });

              buffer = Buffer.concat(chunks);
            }

            if (!buffer || buffer.length === 0) {
              throw new Error('Empty buffer received');
            }

            console.log(`✅ Buffer created for file ${fileCount}: ${buffer.length} bytes`);

            // Validate file
            this.uploadService.validateFileBuffer(
              buffer,
              part.mimetype,
              part.filename
            );

            // Upload file
            const result = await this.uploadService.uploadBannerImage(
              buffer,
              part.filename || `banner-${fileCount}`
            );

            // Generate responsive URLs
            const responsiveUrls = this.uploadService.generateResponsiveImageUrls(result.url);

            uploadedImages.push({
              url: result.url,
              filename: result.filename,
              width: result.width,
              height: result.height,
              size: result.size,
              order: fileCount - 1,
              responsive: responsiveUrls,
            });

            console.log(`✅ File ${fileCount} uploaded successfully: ${result.filename}`);
            filesProcessed = true;

          } catch (fileError) {
            console.error(`❌ Error processing file ${fileCount}:`, fileError);
            errors.push({
              index: fileCount - 1,
              filename: part.filename || `file-${fileCount}`,
              error: fileError.message,
            });
          }
        }

        console.log(`📊 Method 1 completed: ${fileCount} files found, ${uploadedImages.length} uploaded`);

      } catch (method1Error) {
        console.error('❌ Method 1 failed:', method1Error.message);
      }

      // Method 2: Try single file approach multiple times
      if (!filesProcessed) {
        try {
          console.log('📁 Method 2: Using single file() approach...');

          let fileIndex = 0;
          while (fileIndex < 20) { // Max 20 attempts
            try {
              const part = await (request as any).file();

              if (!part) {
                console.log(`📄 No more files at index ${fileIndex}`);
                break;
              }

              fileIndex++;
              console.log(`📄 Single file ${fileIndex}:`, {
                filename: part.filename,
                fieldname: part.fieldname,
                mimetype: part.mimetype,
              });

              // Process the file same as Method 1
              let buffer: Buffer;
              if (typeof part.toBuffer === 'function') {
                buffer = await part.toBuffer();
              } else {
                const chunks: Buffer[] = [];
                const stream = part.file;

                await new Promise<void>((resolve, reject) => {
                  stream.on('data', (chunk: Buffer) => chunks.push(chunk));
                  stream.on('end', () => resolve());
                  stream.on('error', reject);
                  setTimeout(() => reject(new Error('Stream timeout')), 10000);
                });

                buffer = Buffer.concat(chunks);
              }

              if (buffer && buffer.length > 0) {
                this.uploadService.validateFileBuffer(buffer, part.mimetype, part.filename);

                const result = await this.uploadService.uploadBannerImage(
                  buffer,
                  part.filename || `banner-single-${fileIndex}`
                );

                const responsiveUrls = this.uploadService.generateResponsiveImageUrls(result.url);

                uploadedImages.push({
                  url: result.url,
                  filename: result.filename,
                  width: result.width,
                  height: result.height,
                  size: result.size,
                  order: fileIndex - 1,
                  responsive: responsiveUrls,
                });

                console.log(`✅ Single file ${fileIndex} uploaded: ${result.filename}`);
                filesProcessed = true;
              }

            } catch (singleFileError) {
              console.log(`📄 No more files or error at ${fileIndex}:`, singleFileError.message);
              break;
            }
          }

          console.log(`📊 Method 2 completed: ${fileIndex} files processed`);

        } catch (method2Error) {
          console.error('❌ Method 2 failed:', method2Error.message);
        }
      }

      // Method 3: Check request body for attached files
      if (!filesProcessed && (request as any).body) {
        try {
          console.log('📁 Method 3: Checking request body...');
          const body = (request as any).body;

          console.log('Body structure:', {
            keys: Object.keys(body),
            hasFiles: !!body.files,
            filesType: typeof body.files,
            filesIsArray: Array.isArray(body.files),
          });

          if (body.files) {
            const files = Array.isArray(body.files) ? body.files : [body.files];

            for (let i = 0; i < files.length; i++) {
              try {
                const fileData = files[i];
                console.log(`📄 Body file ${i + 1}:`, {
                  filename: fileData.filename,
                  mimetype: fileData.mimetype,
                  hasBuffer: !!fileData.buffer,
                  hasToBuffer: typeof fileData.toBuffer === 'function',
                });

                let buffer: Buffer;
                if (fileData.buffer) {
                  buffer = fileData.buffer;
                } else if (typeof fileData.toBuffer === 'function') {
                  buffer = await fileData.toBuffer();
                } else if (fileData._buf) {
                  buffer = fileData._buf;
                } else {
                  throw new Error('No buffer available');
                }

                if (buffer && buffer.length > 0) {
                  this.uploadService.validateFileBuffer(buffer, fileData.mimetype, fileData.filename);

                  const result = await this.uploadService.uploadBannerImage(
                    buffer,
                    fileData.filename || `banner-body-${i + 1}`
                  );

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

                  console.log(`✅ Body file ${i + 1} uploaded: ${result.filename}`);
                  filesProcessed = true;
                }

              } catch (bodyFileError) {
                console.error(`❌ Error processing body file ${i + 1}:`, bodyFileError);
                errors.push({
                  index: i,
                  filename: files[i]?.filename || `body-file-${i + 1}`,
                  error: bodyFileError.message,
                });
              }
            }

            console.log(`📊 Method 3 completed: ${files.length} files in body`);
          }

        } catch (method3Error) {
          console.error('❌ Method 3 failed:', method3Error.message);
        }
      }

      // Final result
      const totalProcessed = uploadedImages.length + errors.length;

      console.log(`🏁 Final results:`, {
        uploaded: uploadedImages.length,
        errors: errors.length,
        total: totalProcessed,
        filesProcessed,
      });

      if (totalProcessed === 0) {
        throw new BadRequestException(
          'No files found in request. Please ensure:\n' +
          '1. Files are attached with field name "files"\n' +
          '2. Content-Type is multipart/form-data\n' +
          '3. Files are properly selected\n' +
          '4. Check browser network tab for request details'
        );
      }

      return {
        message: uploadedImages.length > 0
          ? `${uploadedImages.length} banner images uploaded successfully`
          : 'No files could be uploaded',
        uploadedCount: uploadedImages.length,
        totalFiles: totalProcessed,
        images: uploadedImages,
        errors: errors.length > 0 ? errors : undefined,
        debug: {
          methodsAttempted: ['files()', 'file()', 'body'],
          filesProcessed,
          timestamp: new Date().toISOString(),
        },
      };

    } catch (error) {
      console.error('❌ FINAL: Multiple banner upload failed:', error);
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