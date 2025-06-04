// src/modules/banners/dto/query-banner.dto.ts - COMPLETE VERSION
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsEnum,
  IsMongoId,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { BannerType, BannerStatus } from '../../../schemas/banner.schema';

export class QueryBannerDto {
  @ApiPropertyOptional({
    description: 'Page number',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search term to find banners by title, description, or content',
    example: 'hero banner',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Banner type filter',
    enum: BannerType,
    example: BannerType.HERO,
  })
  @IsOptional()
  @IsEnum(BannerType)
  type?: BannerType;

  @ApiPropertyOptional({
    description: 'Banner status filter',
    enum: BannerStatus,
    example: BannerStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(BannerStatus)
  status?: BannerStatus;

  @ApiPropertyOptional({
    description: 'Filter by author ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  authorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by target device',
    enum: ['desktop', 'mobile', 'all'],
    example: 'all',
  })
  @IsOptional()
  @IsString()
  targetDevice?: 'desktop' | 'mobile' | 'all';

  @ApiPropertyOptional({
    description: 'Filter by category (show only banners for this category)',
    example: 'technology',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by tag (show only banners for this tag)',
    example: 'javascript',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Show only active banners (considers start/end dates)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  activeOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Filter banners starting from this date (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter banners ending before this date (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDateBefore?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum priority',
    minimum: 0,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPriority?: number;

  @ApiPropertyOptional({
    description: 'Filter by minimum view count',
    minimum: 0,
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minViewCount?: number;

  @ApiPropertyOptional({
    description: 'Filter by minimum click count',
    minimum: 0,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minClickCount?: number;

  @ApiPropertyOptional({
    description: 'Include banners with images only',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasImages?: boolean;

  @ApiPropertyOptional({
    description: 'Include banners with links only',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasLink?: boolean;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: [
      'createdAt',
      'updatedAt',
      'title',
      'priority',
      'order',
      'viewCount',
      'clickCount',
      'startDate',
      'endDate',
    ],
    default: 'createdAt',
    example: 'priority',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
    example: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Include banner statistics in response',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeStats?: boolean;

  @ApiPropertyOptional({
    description: 'Include author information in response',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAuthor?: boolean;
}