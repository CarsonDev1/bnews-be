import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UploadService } from './upload.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);

  constructor(private readonly uploadService: UploadService) { }

  // Chạy cleanup hàng ngày lúc 2:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCleanupCron() {
    this.logger.log('Starting scheduled file cleanup...');

    try {
      // Cleanup temporary files older than 1 day
      await this.cleanupTempFiles(1);

      // Cleanup orphaned files (files không được reference trong database)
      await this.cleanupOrphanedFiles();

      this.logger.log('Scheduled file cleanup completed successfully');
    } catch (error) {
      this.logger.error('Error during scheduled file cleanup:', error);
    }
  }

  async cleanupTempFiles(olderThanDays: number = 1): Promise<void> {
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');

    if (!existsSync(tempDir)) {
      this.logger.warn('Temp directory does not exist');
      return;
    }

    try {
      const files = await fs.readdir(tempDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let deletedCount = 0;

      for (const file of files) {
        if (file === '.gitkeep') continue;

        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
          this.logger.debug(`Deleted temp file: ${file}`);
        }
      }

      this.logger.log(`Cleaned up ${deletedCount} temporary files`);
    } catch (error) {
      this.logger.error('Error cleaning up temp files:', error);
    }
  }

  async cleanupOrphanedFiles(): Promise<void> {
    // This would require database queries to check which files are still referenced
    // Implementation depends on your specific database schema and relationships

    this.logger.log('Orphaned file cleanup not implemented yet');

    // Example implementation:
    /*
    try {
      const uploadDirs = ['avatars', 'posts', 'categories', 'editor'];
      
      for (const dir of uploadDirs) {
        const dirPath = path.join(process.cwd(), 'uploads', dir);
        if (!existsSync(dirPath)) continue;
        
        const files = await fs.readdir(dirPath);
        
        for (const file of files) {
          if (file === '.gitkeep') continue;
          
          const isReferenced = await this.checkFileIsReferenced(dir, file);
          
          if (!isReferenced) {
            const filePath = path.join(dirPath, file);
            await fs.unlink(filePath);
            this.logger.debug(`Deleted orphaned file: ${dir}/${file}`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error cleaning up orphaned files:', error);
    }
    */
  }

  private async checkFileIsReferenced(folder: string, filename: string): Promise<boolean> {
    // Implement database queries to check if file is still referenced
    // For example:
    // - Check User.avatar for avatar files
    // - Check Post.featuredImage for post images
    // - Check Category.icon for category icons

    return true; // Placeholder - implement actual logic
  }

  // Manual cleanup methods
  async manualCleanupTempFiles(): Promise<{ deletedCount: number }> {
    this.logger.log('Starting manual temp file cleanup...');

    const tempDir = path.join(process.cwd(), 'uploads', 'temp');

    if (!existsSync(tempDir)) {
      return { deletedCount: 0 };
    }

    try {
      const files = await fs.readdir(tempDir);
      let deletedCount = 0;

      for (const file of files) {
        if (file === '.gitkeep') continue;

        const filePath = path.join(tempDir, file);
        await fs.unlink(filePath);
        deletedCount++;
      }

      this.logger.log(`Manual cleanup deleted ${deletedCount} temp files`);
      return { deletedCount };
    } catch (error) {
      this.logger.error('Error during manual temp cleanup:', error);
      throw error;
    }
  }

  async getStorageStats(): Promise<{
    totalSize: number;
    fileCount: number;
    folderStats: Array<{
      folder: string;
      size: number;
      count: number;
    }>;
  }> {
    const uploadDirs = ['avatars', 'posts', 'categories', 'editor', 'temp'];
    const folderStats: { folder: string; size: number; count: number }[] = [];
    let totalSize = 0;
    let totalCount = 0;

    for (const dir of uploadDirs) {
      const dirPath = path.join(process.cwd(), 'uploads', dir);

      if (!existsSync(dirPath)) {
        folderStats.push({ folder: dir, size: 0, count: 0 });
        continue;
      }

      const files = await fs.readdir(dirPath);
      let folderSize = 0;
      let folderCount = 0;

      for (const file of files) {
        if (file === '.gitkeep') continue;

        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        folderSize += stats.size;
        folderCount++;
      }

      folderStats.push({
        folder: dir,
        size: folderSize,
        count: folderCount,
      });

      totalSize += folderSize;
      totalCount += folderCount;
    }

    return {
      totalSize,
      fileCount: totalCount,
      folderStats,
    };
  }
}