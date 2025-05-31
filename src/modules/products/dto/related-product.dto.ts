import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RelatedProductDto {
  @ApiProperty({ description: 'Product name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Product URL key/slug' })
  @IsString()
  url_key: string;

  @ApiPropertyOptional({ description: 'Product image URL' })
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @ApiPropertyOptional({ description: 'Product price' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Sale price' })
  @IsOptional()
  @IsNumber()
  sale_price?: number;

  @ApiPropertyOptional({ description: 'Product URL' })
  @IsOptional()
  @IsUrl()
  product_url?: string;
}
