import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export interface RelatedProduct {
  name: string;
  url_key: string;
  image_url: string;
  price: number;
  currency: string;
  sale_price?: number;
  product_url?: string;
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

  // UPDATED: Enhanced slug validation with length limits
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    minlength: 3,
    maxlength: 100,
    validate: {
      validator: function (v: string) {
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
      },
      message: 'Slug must contain only lowercase letters, numbers, and hyphens. Cannot start or end with hyphen.'
    }
  })
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

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({
    type: [
      {
        name: { type: String, required: true },
        url_key: { type: String, required: true },
        image_url: { type: String },
        price: { type: Number },
        currency: { type: String, default: 'VND' },
        sale_price: { type: Number },
        product_url: { type: String },
      },
    ],
    default: [],
  })
  relatedProducts: RelatedProduct[];

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

// ENHANCED: Better indexes for slug performance and validation
PostSchema.index({ slug: 1 }, { unique: true });
PostSchema.index({ categoryId: 1, status: 1 });
PostSchema.index({ authorId: 1, status: 1 });
PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ viewCount: -1 });
PostSchema.index({ isFeatured: 1, publishedAt: -1 });
PostSchema.index({ isSticky: -1, publishedAt: -1 });
PostSchema.index({ 'relatedProducts.url_key': 1 });
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

// NEW: Pre-save middleware for slug validation and sanitization
PostSchema.pre('save', function (next) {
  if (this.isModified('slug')) {
    // Ensure slug is lowercase and properly formatted
    this.slug = this.slug.toLowerCase().trim();

    // Validate slug length
    if (this.slug.length < 3) {
      return next(new Error('Slug must be at least 3 characters long'));
    }

    if (this.slug.length > 100) {
      return next(new Error('Slug must not exceed 100 characters'));
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(this.slug)) {
      return next(new Error('Slug must contain only lowercase letters, numbers, and hyphens. Cannot start or end with hyphen.'));
    }
  }

  next();
});

// NEW: Post-save logging for debugging
PostSchema.post('save', function (doc) {
  console.log('📝 Post saved:', {
    id: doc._id,
    title: doc.title,
    slug: doc.slug,
    slugLength: doc.slug.length,
  });
});