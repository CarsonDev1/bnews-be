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
  isMongoId,
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

export class BannerImageDto {
  @ApiProperty({ description: 'Image URL' })
  @IsString()
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'Image filename' })
  @IsString()
  filename: string;

  @ApiPropertyOptional({ description: 'Alt text for accessibility' })
  @IsOptional()
  @IsString()
  alt?: string;

  @ApiPropertyOptional({ description: 'Image title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Image width in pixels' })
  @IsNumber()
  @Min(1)
  width: number;

  @ApiProperty({ description: 'Image height in pixels' })
  @IsNumber()
  @Min(1)
  height: number;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  size: number;

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

export class CreateBannerDto {
  @ApiProperty({ description: 'Banner title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Banner description' })
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
    description: 'Banner images',
    type: [BannerImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BannerImageDto)
  images?: BannerImageDto[];

  @ApiPropertyOptional({ description: 'HTML content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Link URL' })
  @IsOptional()
  @IsUrl()
  linkUrl?: string;

  @ApiPropertyOptional({ description: 'Open link in new tab', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  openInNewTab?: boolean;

  @ApiPropertyOptional({ description: 'Button text' })
  @IsOptional()
  @IsString()
  buttonText?: string;

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ description: 'Priority (higher shows first)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Show only on specific categories',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({
    description: 'Show only on specific tags',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Target device',
    enum: ['desktop', 'mobile', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsString()
  targetDevice?: 'desktop' | 'mobile' | 'all';

  @ApiPropertyOptional({ description: 'SEO title' })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO description' })
  @IsOptional()
  @IsString()
  seoDescription?: string;
}
