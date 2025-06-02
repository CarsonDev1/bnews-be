import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsEnum,
  IsMongoId,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { CommentStatus } from '../../../schemas/comment.schema';

export class QueryCommentDto {
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

  @ApiPropertyOptional({ description: 'Post ID to filter comments' })
  @IsOptional()
  @IsMongoId()
  postId?: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  @IsOptional()
  @IsMongoId()
  parentId?: string;

  @ApiPropertyOptional({ description: 'External user ID' })
  @IsOptional()
  @IsString()
  externalUserId?: string;

  @ApiPropertyOptional({ description: 'Comment status', enum: CommentStatus })
  @IsOptional()
  @IsEnum(CommentStatus)
  status?: any;

  @ApiPropertyOptional({ description: 'Include replies', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeReplies?: boolean;

  @ApiPropertyOptional({
    description: 'Sort by',
    enum: ['createdAt', 'likeCount'],
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
