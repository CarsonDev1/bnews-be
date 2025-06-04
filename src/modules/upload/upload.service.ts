// src/modules/upload/upload.service.ts - UPDATED WITH TAG & BANNER SUPPORT
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface LocalUploadResponse {
  filename: string;
  originalName: string;
  url: string;
  path: string;
  width: number;
  height: number;
  size: number;
  format: string;
  mimetype: string;
}

@Injectable()
export class UploadService {
  private readonly uploadsDir: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadsDir = this.configService.get<string>('UPLOADS_DIR') || 'uploads';
    this.baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:5000';

    this.ensureUploadDirectories();
  }

  private async ensureUploadDirectories(): Promise<void> {
    const directories = [
      this.uploadsDir,
      path.join(this.uploadsDir, 'avatars'),
      path.join(this.uploadsDir, 'posts'),
      path.join(this.uploadsDir, 'categories'),
      path.join(this.uploadsDir, 'tags'), // NEW: Tag images
      path.join(this.uploadsDir, 'banners'), // NEW: Banner images
      path.join(this.uploadsDir, 'editor'),
      path.join(this.uploadsDir, 'temp'),
    ];

    for (const dir of directories) {
      if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  async uploadImage(
    file: Buffer,
    folder: string,
    originalName: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
      crop?: boolean;
    } = {},
  ): Promise<LocalUploadResponse> {
    try {
      const fileExtension = options.format || 'webp';
      const filename = `${uuidv4()}.${fileExtension}`;
      const uploadPath = path.join(this.uploadsDir, folder);
      const fullPath = path.join(uploadPath, filename);

      if (!existsSync(uploadPath)) {
        await fs.mkdir(uploadPath, { recursive: true });
      }

      let sharpInstance = sharp(file);
      const metadata = await sharpInstance.metadata();

      if (options.width || options.height) {
        sharpInstance = sharpInstance.resize(options.width, options.height, {
          fit: options.crop ? 'cover' : 'inside',
          withoutEnlargement: true,
        });
      }

      switch (fileExtension) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({
            quality: options.quality || 85,
            progressive: true,
          });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({
            quality: options.quality || 90,
            compressionLevel: 6,
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality: options.quality || 85,
          });
          break;
      }

      const processedBuffer = await sharpInstance.toBuffer();
      await fs.writeFile(fullPath, processedBuffer);

      const processedMetadata = await sharp(processedBuffer).metadata();
      const stats = await fs.stat(fullPath);

      const url = `${this.baseUrl}/uploads/${folder}/${filename}`;

      console.log(`✅ File uploaded successfully: ${url}`);

      return {
        filename,
        originalName,
        url,
        path: fullPath,
        width: processedMetadata.width || metadata.width || 0,
        height: processedMetadata.height || metadata.height || 0,
        size: stats.size,
        format: fileExtension,
        mimetype: `image/${fileExtension}`,
      };
    } catch (error) {
      console.error('❌ Upload error:', error);
      throw new BadRequestException(`Image processing failed: ${error.message}`);
    }
  }

  async uploadAvatar(file: Buffer, originalName: string = 'avatar'): Promise<LocalUploadResponse> {
    return this.uploadImage(file, 'avatars', originalName, {
      width: 300,
      height: 300,
      quality: 85,
      format: 'webp',
      crop: true,
    });
  }

  async uploadPostImage(file: Buffer, originalName: string = 'post-image'): Promise<LocalUploadResponse> {
    try {
      console.log('📄 [SERVICE] uploadPostImage called');
      const result = await this.uploadImage(file, 'posts', originalName, {
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

  async uploadCategoryIcon(file: Buffer, originalName: string = 'category-icon'): Promise<LocalUploadResponse> {
    return this.uploadImage(file, 'categories', originalName, {
      width: 64,
      height: 64,
      quality: 90,
      format: 'png',
      crop: true,
    });
  }

  // NEW: Upload tag image
  async uploadTagImage(file: Buffer, originalName: string = 'tag-image'): Promise<LocalUploadResponse> {
    return this.uploadImage(file, 'tags', originalName, {
      width: 200,
      height: 200,
      quality: 85,
      format: 'webp',
      crop: true,
    });
  }

  // NEW: Upload banner image (single)
  async uploadBannerImage(file: Buffer, originalName: string = 'banner-image'): Promise<LocalUploadResponse> {
    return this.uploadImage(file, 'banners', originalName, {
      width: 1920,
      height: 600,
      quality: 90,
      format: 'webp',
      crop: false, // Keep original aspect ratio for banners
    });
  }

  // NEW: Upload multiple banner images
  async uploadMultipleBannerImages(
    files: Buffer[],
    originalNames: string[] = []
  ): Promise<LocalUploadResponse[]> {
    const results: LocalUploadResponse[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalName = originalNames[i] || `banner-image-${i + 1}`;

      try {
        const result = await this.uploadBannerImage(file, originalName);
        results.push(result);
      } catch (error) {
        console.error(`❌ Error uploading banner image ${i + 1}:`, error);
        // Continue with other files, don't fail the entire operation
      }
    }

    return results;
  }

  async uploadEditorImage(file: Buffer, originalName: string = 'editor-image'): Promise<LocalUploadResponse> {
    return this.uploadImage(file, 'editor', originalName, {
      width: 1000,
      quality: 80,
      format: 'webp',
    });
  }

  async deleteImage(filePath: string): Promise<void> {
    try {
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
        console.log(`🗑️ Deleted file: ${filePath}`);
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }

  async deleteImageByUrl(url: string): Promise<void> {
    try {
      const relativePath = url.replace(this.baseUrl, '');
      const fullPath = path.join(process.cwd(), relativePath);
      await this.deleteImage(fullPath);
    } catch (error) {
      console.error('Failed to delete image by URL:', error);
    }
  }

  // NEW: Delete multiple images
  async deleteMultipleImages(urls: string[]): Promise<void> {
    for (const url of urls) {
      await this.deleteImageByUrl(url);
    }
  }

  generateThumbnail(originalUrl: string, width: number, height: number): string {
    const url = new URL(originalUrl);
    const pathParts = url.pathname.split('.');
    const extension = pathParts.pop();
    const basePath = pathParts.join('.');

    return `${url.protocol}//${url.host}${basePath}_${width}x${height}.${extension}`;
  }

  generateResponsiveImageUrls(originalUrl: string): {
    small: string;
    medium: string;
    large: string;
    original: string;
  } {
    return {
      small: this.generateThumbnail(originalUrl, 400, 300),
      medium: this.generateThumbnail(originalUrl, 800, 600),
      large: this.generateThumbnail(originalUrl, 1200, 800),
      original: originalUrl,
    };
  }

  async createResponsiveVersions(
    file: Buffer,
    folder: string,
    originalName: string
  ): Promise<{
    small: LocalUploadResponse;
    medium: LocalUploadResponse;
    large: LocalUploadResponse;
    original: LocalUploadResponse;
  }> {
    const [small, medium, large, original] = await Promise.all([
      this.uploadImage(file, folder, `${originalName}_small`, {
        width: 400,
        height: 300,
        quality: 80,
        format: 'webp',
        crop: true,
      }),
      this.uploadImage(file, folder, `${originalName}_medium`, {
        width: 800,
        height: 600,
        quality: 85,
        format: 'webp',
        crop: true,
      }),
      this.uploadImage(file, folder, `${originalName}_large`, {
        width: 1200,
        height: 800,
        quality: 85,
        format: 'webp',
        crop: true,
      }),
      this.uploadImage(file, folder, originalName, {
        quality: 90,
        format: 'webp',
      }),
    ]);

    return { small, medium, large, original };
  }

  validateFile(file: Express.Multer.File): void {
    const maxSize = this.configService.get<number>('MAX_FILE_SIZE') || 10485760;
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

  validateFileBuffer(buffer: Buffer, mimetype: string, filename?: string): void {
    const maxSize = this.configService.get<number>('MAX_FILE_SIZE') || 10485760;
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

    if (filename && !filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      throw new BadRequestException('File must have a valid image extension');
    }
  }

  getOptimizedImageUrl(
    originalUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: 'auto' | number;
      format?: 'auto' | 'webp' | 'jpg' | 'png';
      crop?: 'fill' | 'fit' | 'scale';
    } = {},
  ): string {
    return originalUrl;
  }

  async getFileInfo(filePath: string): Promise<{
    exists: boolean;
    size?: number;
    stats?: any;
  }> {
    try {
      if (!existsSync(filePath)) {
        return { exists: false };
      }

      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        stats,
      };
    } catch (error) {
      return { exists: false };
    }
  }

  async cleanupOldFiles(olderThanDays: number = 30): Promise<void> {
    const tempDir = path.join(this.uploadsDir, 'temp');
    if (!existsSync(tempDir)) return;

    try {
      const files = await fs.readdir(tempDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`🗑️ Cleaned up old file: ${filePath}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old files:', error);
    }
  }
}