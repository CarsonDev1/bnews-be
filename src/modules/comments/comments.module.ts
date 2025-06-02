import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { CommentsController } from './comments.controller';
import { ExternalUserService } from './services/external-user.service';
import { Comment, CommentSchema } from '../../schemas/comment.schema';
import { Post, PostSchema } from '../../schemas/post.schema';
import { AuthModule } from '../auth/auth.module';
import { CommentsService } from 'src/modules/comments/services/comments.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: Post.name, schema: PostSchema },
    ]),
    ConfigModule,
    AuthModule, // For admin moderation
  ],
  controllers: [CommentsController],
  providers: [CommentsService, ExternalUserService],
  exports: [CommentsService],
})
export class CommentsModule {}
