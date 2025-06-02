import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommentStatus } from '../../../schemas/comment.schema';

export class ModerateCommentDto {
  @ApiProperty({ description: 'New comment status', enum: CommentStatus })
  @IsEnum(CommentStatus)
  status: CommentStatus;

  @ApiPropertyOptional({ description: 'Moderation reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}
