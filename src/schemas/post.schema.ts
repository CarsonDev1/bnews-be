import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Schema({
  timestamps: true,
  collection: 'posts',
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;

      // Ensure populated fields are properly formatted
      if (ret.tagIds) {
        ret.tags = ret.tagIds; // Create alias
        // Keep original tagIds for backward compatibility
      }

      if (ret.categoryId && typeof ret.categoryId === 'object') {
        ret.category = ret.categoryId; // Create alias
      }

      if (ret.authorId && typeof ret.authorId === 'object') {
        ret.author = ret.authorId; // Create alias
      }

      return ret;
    },
  },
})
export class Post {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ trim: true })
  excerpt?: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  featuredImage?: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }], default: [] })
  tagIds: Types.ObjectId[];

  // UPDATED: Author field is now required
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ enum: PostStatus, default: PostStatus.PUBLISHED })
  status: PostStatus;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ default: 0 })
  commentCount: number;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: false })
  isSticky: boolean;

  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop()
  seoTitle?: string;

  @Prop()
  seoDescription?: string;

  @Prop([String])
  seoKeywords?: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Add indexes for SEO and performance
PostSchema.index({ slug: 1 });
PostSchema.index({ categoryId: 1, status: 1 });
PostSchema.index({ authorId: 1, status: 1 }); // NEW: Author index
PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ viewCount: -1 });
PostSchema.index({ isFeatured: 1, publishedAt: -1 });
PostSchema.index({ isSticky: -1, publishedAt: -1 });
PostSchema.index({ tagIds: 1 });

// Text search index for SEO
PostSchema.index(
  {
    title: 'text',
    content: 'text',
    excerpt: 'text',
  },
  {
    weights: {
      title: 10,
      excerpt: 5,
      content: 1,
    },
  },
);
