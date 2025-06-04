// src/modules/tags/dto/create-tag.dto.ts - UPDATED WITH IMAGE SUPPORT
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateTagDto {
  @ApiProperty({
    description: 'Tag name',
    example: 'JavaScript',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Tag description',
    example: 'JavaScript programming language related posts',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Tag color (hex)',
    example: '#f39c12',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Tag image URL (will be set via upload endpoint)',
    example: 'http://localhost:5000/uploads/tags/javascript-icon.webp',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({
    description: 'Is tag active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'SEO title for tag page',
    example: 'JavaScript Tutorials and Articles',
  })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO description for tag page',
    example: 'Learn JavaScript with our comprehensive tutorials and articles covering everything from basics to advanced topics.',
  })
  @IsOptional()
  @IsString()
  seoDescription?: string;
}