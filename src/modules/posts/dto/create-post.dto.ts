import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PostStatus } from '../../../schemas/post.schema';

export class CreatePostDto {
  @ApiProperty({ description: 'Post title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Post excerpt' })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiProperty({ description: 'Post content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Featured image URL' })
  @IsOptional()
  @IsString()
  featuredImage?: string;

  @ApiProperty({ description: 'Category ID' })
  @IsMongoId()
  categoryId: string;

  @ApiPropertyOptional({ description: 'Tag IDs' })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({
    description: 'Post status',
    enum: PostStatus,
    default: PostStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({ description: 'Is featured post', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Is sticky post', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isSticky?: boolean;

  @ApiPropertyOptional({ description: 'Publish date' })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiPropertyOptional({ description: 'SEO title' })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO description' })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional({ description: 'SEO keywords' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seoKeywords?: string[];
}
