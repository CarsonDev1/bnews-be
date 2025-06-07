// src/modules/posts/dto/update-post.dto.ts - UPDATED WITH MANUAL SLUG
import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  Matches
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto';

export class UpdatePostDto extends PartialType(CreatePostDto) {
  // Override slug to make it optional for updates but with same validation
  @ApiPropertyOptional({
    description: 'Post slug (URL-friendly identifier)',
    example: 'my-updated-post',
    minLength: 3,
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Slug must be at least 3 characters long' })
  @MaxLength(100, { message: 'Slug must not exceed 100 characters' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens. Cannot start or end with hyphen.',
  })
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  slug?: string;
}