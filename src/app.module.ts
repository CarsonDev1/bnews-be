// src/app.module.ts - FIXED VERSION
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CategoriesModule } from './modules/categories/categories.module';
import { PostsModule } from './modules/posts/posts.module';
import { TagsModule } from './modules/tags/tags.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Category, CategorySchema } from './schemas/category.schema';
import { Post, PostSchema } from './schemas/post.schema';
import { Tag, TagSchema } from './schemas/tag.schema';
import { User, UserSchema } from './schemas/user.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';
import {
  UserActivity,
  UserActivitySchema,
} from './schemas/user-activity.schema';
import { UploadModule } from 'src/modules/upload/upload.module';
import { ProductsModule } from 'src/modules/products/products.module';
import { CommentsModule } from 'src/modules/comments/comments.module';
import { BannersModule } from 'src/modules/banners/banners.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb://localhost:27017/forum',
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Post.name, schema: PostSchema },
      { name: Tag.name, schema: TagSchema },
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: UserActivity.name, schema: UserActivitySchema },
    ]),
    AuthModule,
    UsersModule,
    CategoriesModule,
    PostsModule,
    TagsModule,
    UploadModule,
    BannersModule,
    ProductsModule,
    CommentsModule,
    // REMOVED StaticModule - let @fastify/static handle everything
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }