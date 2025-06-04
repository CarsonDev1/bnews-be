import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import * as path from 'path';
import { existsSync } from 'fs';

@ApiTags('static')
@Controller('uploads')
export class StaticController {
  @Get(':folder/:filename')
  @ApiOperation({ summary: 'Serve uploaded files' })
  @ApiParam({
    name: 'folder',
    description: 'Upload folder (avatars, posts, categories, editor)',
    example: 'posts'
  })
  @ApiParam({
    name: 'filename',
    description: 'File name with extension',
    example: '431a43a4-660f-4b36-9140-3a678c5a886c.webp'
  })
  @ApiResponse({ status: 200, description: 'File served successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async serveFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() reply: any,
  ) {
    try {
      // Validate folder to prevent directory traversal
      const allowedFolders = ['avatars', 'posts', 'categories', 'editor', 'temp'];
      if (!allowedFolders.includes(folder)) {
        throw new NotFoundException('Invalid folder');
      }

      // Validate filename has extension
      if (!filename.includes('.')) {
        throw new NotFoundException('Invalid filename - extension required');
      }

      const filePath = path.join(process.cwd(), 'uploads', folder, filename);

      // Check if file exists
      if (!existsSync(filePath)) {
        throw new NotFoundException(`File not found: ${folder}/${filename}`);
      }

      // Security check - ensure the resolved path is within uploads directory
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(path.resolve(uploadsDir))) {
        throw new NotFoundException('Invalid file path');
      }

      // Set appropriate headers
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };

      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      // Set headers
      reply.header('Content-Type', mimeType);
      reply.header('Cache-Control', 'public, max-age=31536000');
      reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('X-Frame-Options', 'DENY');
      reply.header('ETag', `"${filename}"`);

      // Send file using Fastify's sendFile
      return reply.sendFile(filename, path.join(process.cwd(), 'uploads', folder));
    } catch (error) {
      console.error('Error serving file:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('File not found');
    }
  }
}
