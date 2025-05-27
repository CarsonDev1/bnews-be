import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  publicId: string;

  @ApiProperty()
  width: number;

  @ApiProperty()
  height: number;
}

export class ResponsiveImageUrls {
  @ApiProperty()
  small: string;

  @ApiProperty()
  medium: string;

  @ApiProperty()
  large: string;

  @ApiProperty()
  original: string;
}

export class PostImageUploadResponseDto extends UploadResponseDto {
  @ApiProperty({ type: ResponsiveImageUrls })
  responsive: ResponsiveImageUrls;
}
