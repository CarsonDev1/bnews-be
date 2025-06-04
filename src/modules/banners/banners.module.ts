import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Banner, BannerSchema } from '../../schemas/banner.schema';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';
import { BannersController } from 'src/modules/banners/banners.controller';
import { BannersService } from 'src/modules/banners/banners.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Banner.name, schema: BannerSchema },
    ]),
    forwardRef(() => AuthModule),
    UploadModule,
  ],
  controllers: [BannersController],
  providers: [BannersService],
  exports: [BannersService],
})
export class BannersModule { }