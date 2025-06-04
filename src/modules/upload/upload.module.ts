// src/modules/upload/upload.module.ts - FIXED VERSION
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from 'src/modules/upload/upload.controller';
import { UploadService } from 'src/modules/upload/upload.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => AuthModule), // Use forwardRef if needed
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService], // CRITICAL: Make sure UploadService is exported
})
export class UploadModule { }