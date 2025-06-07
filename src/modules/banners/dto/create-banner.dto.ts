// src/modules/banners/dto/create-banner.dto.ts - FINAL FIX

import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsDateString,
  ValidateNested,
  IsUrl,
  Min,
  IsMongoId,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { BannerType, BannerStatus } from '../../../schemas/banner.schema';

export class QueryBannerDto {
  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Banner type',
    enum: BannerType,
  })
  @IsOptional()
  @IsEnum(BannerType)
  type?: BannerType;

  @ApiPropertyOptional({
    description: 'Banner status',
    enum: BannerStatus,
  })
  @IsOptional()
  @IsEnum(BannerStatus)
  status?: BannerStatus;

  @ApiPropertyOptional({ description: 'Author ID' })
  @IsOptional()
  @IsMongoId()
  authorId?: string;

  @ApiPropertyOptional({
    description: 'Sort by',
    enum: ['createdAt', 'title', 'priority', 'order', 'viewCount', 'clickCount'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// FINAL FIX: Simplified Banner Image DTO - only use 'url' field
export class BannerImageDto {
  @ApiProperty({
    description: 'Image URL',
    example: 'http://localhost:5000/uploads/banners/banner-image.webp'
  })
  @IsString({ message: 'url must be a string' })
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_host: true,
    require_valid_protocol: true,
    allow_underscores: true,
    allow_trailing_dot: false,
    allow_protocol_relative_urls: false,
    disallow_auth: false
  }, {
    message: 'url must be a valid URL address (e.g., http://localhost:5000/uploads/banners/image.webp)'
  })
  url: string;

  @ApiProperty({
    description: 'Image filename',
    example: 'banner-image.webp'
  })
  @IsString({ message: 'filename must be a string' })
  filename: string;

  @ApiPropertyOptional({
    description: 'Alt text for accessibility',
    example: 'Banner showing new product promotion'
  })
  @IsOptional()
  @IsString({ message: 'alt must be a string' })
  alt?: string;

  @ApiPropertyOptional({
    description: 'Image title',
    example: 'New Product Banner'
  })
  @IsOptional()
  @IsString({ message: 'title must be a string' })
  title?: string;

  @ApiProperty({
    description: 'Image width in pixels',
    example: 1920,
    minimum: 1
  })
  @IsNumber({}, { message: 'width must be a number' })
  @Min(1, { message: 'width must be at least 1 pixel' })
  @Type(() => Number)
  width: number;

  @ApiProperty({
    description: 'Image height in pixels',
    example: 600,
    minimum: 1
  })
  @IsNumber({}, { message: 'height must be a number' })
  @Min(1, { message: 'height must be at least 1 pixel' })
  @Type(() => Number)
  height: number;

  @ApiProperty({
    description: 'File size in bytes',
    example: 156789,
    minimum: 1
  })
  @IsNumber({}, { message: 'size must be a number' })
  @Min(1, { message: 'size must be at least 1 byte' })
  @Type(() => Number)
  size: number;

  @ApiPropertyOptional({
    description: 'Display order',
    example: 0,
    default: 0,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: 'order must be a number' })
  @Min(0, { message: 'order must be at least 0' })
  @Type(() => Number)
  order?: number = 0;
}

export class CreateBannerDto {
  @ApiProperty({
    description: 'Banner title',
    example: 'Holiday Sale Banner'
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Banner description',
    example: 'Special holiday promotion banner'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Banner type',
    enum: BannerType,
    example: BannerType.HERO
  })
  @IsEnum(BannerType)
  type: BannerType;

  @ApiPropertyOptional({
    description: 'Banner status',
    enum: BannerStatus,
    default: BannerStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(BannerStatus)
  status?: BannerStatus;

  @ApiPropertyOptional({
    description: 'Banner images array',
    type: [BannerImageDto],
    example: [
      {
        url: 'http://localhost:5000/uploads/banners/banner-1.webp',
        filename: 'banner-1.webp',
        alt: 'Holiday sale banner',
        title: 'Holiday Sale',
        width: 1920,
        height: 600,
        size: 156789,
        order: 0
      }
    ]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BannerImageDto)
  images?: BannerImageDto[];

  @ApiPropertyOptional({
    description: 'HTML content',
    example: '<h2>Special Offer!</h2><p>Get 50% off on selected items</p>'
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Link URL',
    example: 'https://example.com/sale'
  })
  @IsOptional()
  @IsUrl({}, { message: 'Link URL must be a valid URL address' })
  linkUrl?: string;

  @ApiPropertyOptional({
    description: 'Open link in new tab',
    default: false,
    example: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  openInNewTab?: boolean;

  @ApiPropertyOptional({
    description: 'Button text',
    example: 'Shop Now'
  })
  @IsOptional()
  @IsString()
  buttonText?: string;

  @ApiPropertyOptional({
    description: 'Display order',
    default: 0,
    example: 1,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    description: 'Priority (higher shows first)',
    default: 0,
    example: 10,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Start date (ISO string or empty)',
    example: '2024-12-01T00:00:00.000Z'
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    return value;
  })
  @IsDateString({}, { message: 'Start date must be a valid ISO 8601 date string' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO string or empty)',
    example: '2024-12-31T23:59:59.999Z'
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    return value;
  })
  @IsDateString({}, { message: 'End date must be a valid ISO 8601 date string' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Show only on specific categories',
    type: [String],
    example: ['technology', 'mobile']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({
    description: 'Show only on specific tags',
    type: [String],
    example: ['sale', 'promotion']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Target device',
    enum: ['desktop', 'mobile', 'all'],
    default: 'all',
    example: 'all'
  })
  @IsOptional()
  @IsString()
  targetDevice?: 'desktop' | 'mobile' | 'all';

  @ApiPropertyOptional({
    description: 'SEO title',
    example: 'Holiday Sale Banner - Special Offers'
  })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO description',
    example: 'Check out our amazing holiday sale with up to 50% off on selected items'
  })
  @IsOptional()
  @IsString()
  seoDescription?: string;
}