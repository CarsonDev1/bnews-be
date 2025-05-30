import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as sharp from 'sharp';

export interface CloudinaryResponse {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
}

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Buffer,
    folder: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
      crop?: boolean;
    } = {},
  ): Promise<CloudinaryResponse> {
    try {
      // Process image with Sharp for optimization
      let processedBuffer = file;

      if (options.width || options.height || options.format) {
        let sharpInstance = sharp(file);

        // Resize if dimensions provided
        if (options.width || options.height) {
          sharpInstance = sharpInstance.resize(options.width, options.height, {
            fit: options.crop ? 'cover' : 'inside',
            withoutEnlargement: true,
          });
        }

        // Convert format and set quality
        if (options.format === 'jpeg') {
          sharpInstance = sharpInstance.jpeg({
            quality: options.quality || 85,
            progressive: true,
          });
        } else if (options.format === 'png') {
          sharpInstance = sharpInstance.png({
            quality: options.quality || 90,
            compressionLevel: 6,
          });
        } else if (options.format === 'webp') {
          sharpInstance = sharpInstance.webp({
            quality: options.quality || 85,
          });
        }

        processedBuffer = await sharpInstance.toBuffer();
      }

      // Upload to Cloudinary
      return new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder,
              resource_type: 'image',
              format: options.format,
              quality: 'auto:good',
              fetch_format: 'auto',
              flags: 'progressive',
            },
            (error, result) => {
              if (error) {
                reject(
                  new BadRequestException(`Upload failed: ${error.message}`),
                );
              } else {
                resolve(result as CloudinaryResponse);
              }
            },
          )
          .end(processedBuffer);
      });
    } catch (error) {
      throw new BadRequestException(
        `Image processing failed: ${error.message}`,
      );
    }
  }

  async uploadAvatar(file: Buffer): Promise<CloudinaryResponse> {
    return this.uploadImage(file, 'forum/avatars', {
      width: 300,
      height: 300,
      quality: 85,
      format: 'webp',
      crop: true,
    });
  }

  async uploadPostImage(file: Buffer): Promise<CloudinaryResponse> {
    try {
      console.log('📄 [SERVICE] uploadPostImage called');
      console.log('📄 [SERVICE] Buffer size:', file.length);
      console.log('📄 [SERVICE] Calling uploadImage with params:', {
        folder: 'forum/posts',
        width: 1200,
        height: 630,
        quality: 85,
        format: 'webp',
        crop: true,
      });

      const result = await this.uploadImage(file, 'forum/posts', {
        width: 1200,
        height: 630,
        quality: 85,
        format: 'webp',
        crop: true,
      });

      console.log('✅ [SERVICE] uploadPostImage completed successfully');
      return result;
    } catch (error) {
      console.error('❌ [SERVICE] uploadPostImage error:', error);
      throw error;
    }
  }

  async uploadCategoryIcon(file: Buffer): Promise<CloudinaryResponse> {
    return this.uploadImage(file, 'forum/categories', {
      width: 64,
      height: 64,
      quality: 90,
      format: 'png',
      crop: true,
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Failed to delete image from Cloudinary:', error);
      // Don't throw error - deletion failure shouldn't break the app
    }
  }

  // FIX: Add explicit return type and make it synchronous
  generateThumbnail(publicId: string, width: number, height: number): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 'auto:good',
      fetch_format: 'auto',
    });
  }

  // FIX: Add explicit return type and make it synchronous
  generateResponsiveImageUrls(publicId: string): {
    small: string;
    medium: string;
    large: string;
    original: string;
  } {
    const baseUrl = cloudinary.url(publicId, {
      quality: 'auto:good',
      fetch_format: 'auto',
    });

    return {
      small: cloudinary.url(publicId, {
        width: 400,
        height: 300,
        crop: 'fill',
        quality: 'auto:good',
        fetch_format: 'auto',
      }),
      medium: cloudinary.url(publicId, {
        width: 800,
        height: 600,
        crop: 'fill',
        quality: 'auto:good',
        fetch_format: 'auto',
      }),
      large: cloudinary.url(publicId, {
        width: 1200,
        height: 800,
        crop: 'fill',
        quality: 'auto:good',
        fetch_format: 'auto',
      }),
      original: baseUrl,
    };
  }

  // FIX: Make validateFile method public and fix parameter type
  validateFile(file: Express.Multer.File): void {
    const maxSize = this.configService.get<number>('MAX_FILE_SIZE') || 10485760; // 10MB
    const allowedTypes = this.configService
      .get<string>('ALLOWED_MIME_TYPES')
      ?.split(',') || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
      );
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }
  }

  // BONUS: Add method to validate buffer files (useful for direct buffer uploads)
  validateFileBuffer(buffer: Buffer, mimetype: string): void {
    const maxSize = this.configService.get<number>('MAX_FILE_SIZE') || 10485760; // 10MB
    const allowedTypes = this.configService
      .get<string>('ALLOWED_MIME_TYPES')
      ?.split(',') || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (buffer.length > maxSize) {
      throw new BadRequestException(
        `File size too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
      );
    }

    if (!allowedTypes.includes(mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }
  }

  // BONUS: Add method to get optimized URL with options
  getOptimizedImageUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: 'auto' | number;
      format?: 'auto' | 'webp' | 'jpg' | 'png';
      crop?: 'fill' | 'fit' | 'scale';
    } = {},
  ): string {
    return cloudinary.url(publicId, {
      width: options.width,
      height: options.height,
      crop: options.crop || 'fill',
      quality: options.quality || 'auto:good',
      fetch_format: options.format || 'auto',
    });
  }
}
