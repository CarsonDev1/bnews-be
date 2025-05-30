import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PostStatus } from '../../../schemas/post.schema';

export class CategoryPostsQueryDto {
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

  @ApiPropertyOptional({
    description: 'Sort by',
    enum: ['createdAt', 'publishedAt', 'viewCount', 'likeCount', 'title'],
    default: 'publishedAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'publishedAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Post status',
    enum: PostStatus,
    default: PostStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus = PostStatus.PUBLISHED;

  @ApiPropertyOptional({
    description: 'Include children categories',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeChildren?: boolean;

  @ApiPropertyOptional({
    description: 'Include subcategories posts',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeSubcategories?: boolean;
}
