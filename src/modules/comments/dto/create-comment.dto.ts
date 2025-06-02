import {
  IsString,
  IsOptional,
  IsMongoId,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment content',
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;

  @ApiProperty({ description: 'Post ID to comment on' })
  @IsMongoId()
  postId: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  @IsOptional()
  @IsMongoId()
  parentId?: string;

  // External user data (will be populated from middleware/service)
  externalUserId?: string;
  authorName?: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorMobile?: string;
  authorRanking?: string;
}
