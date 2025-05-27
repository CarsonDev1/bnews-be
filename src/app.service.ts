import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Post, PostDocument, PostStatus } from './schemas/post.schema';
import { Tag, TagDocument } from './schemas/tag.schema';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
  ) {}

  getHealth() {
    return {
      status: 'ok',
      message: 'Forum API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  async getStats() {
    const [
      totalCategories,
      activeCategories,
      totalPosts,
      publishedPosts,
      draftPosts,
      totalTags,
      activeTags,
    ] = await Promise.all([
      this.categoryModel.countDocuments(),
      this.categoryModel.countDocuments({ isActive: true }),
      this.postModel.countDocuments(),
      this.postModel.countDocuments({ status: PostStatus.PUBLISHED }),
      this.postModel.countDocuments({ status: PostStatus.DRAFT }),
      this.tagModel.countDocuments(),
      this.tagModel.countDocuments({ isActive: true }),
    ]);

    return {
      categories: {
        total: totalCategories,
        active: activeCategories,
      },
      posts: {
        total: totalPosts,
        published: publishedPosts,
        draft: draftPosts,
      },
      tags: {
        total: totalTags,
        active: activeTags,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
