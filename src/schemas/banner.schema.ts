// src/schemas/banner.schema.ts - NEW SCHEMA
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BannerDocument = Banner & Document;

export enum BannerType {
  HERO = 'hero',
  SIDEBAR = 'sidebar',
  HEADER = 'header',
  FOOTER = 'footer',
  POPUP = 'popup',
  INLINE = 'inline',
}

export enum BannerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled',
  EXPIRED = 'expired',
}

export interface BannerImage {
  url: string;
  filename: string;
  alt?: string;
  title?: string;
  width: number;
  height: number;
  size: number;
  order: number; // For image ordering
}

@Schema({
  timestamps: true,
  collection: 'banners',
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Banner {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ enum: BannerType, required: true })
  type: BannerType;

  @Prop({ enum: BannerStatus, default: BannerStatus.ACTIVE })
  status: BannerStatus;

  // Multiple images with metadata
  @Prop({
    type: [
      {
        url: { type: String, required: true },
        filename: { type: String, required: true },
        alt: { type: String },
        title: { type: String },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        size: { type: Number, required: true },
        order: { type: Number, default: 0 },
      },
    ],
    default: [],
  })
  images: BannerImage[];

  // Banner content and links
  @Prop()
  content?: string; // HTML content

  @Prop()
  linkUrl?: string;

  @Prop({ default: false })
  openInNewTab: boolean;

  @Prop()
  buttonText?: string;

  // Display settings
  @Prop({ default: 0 })
  order: number; // For banner ordering

  @Prop({ default: 0 })
  priority: number; // Higher priority shows first

  @Prop({ default: 0 })
  clickCount: number;

  @Prop({ default: 0 })
  viewCount: number;

  // Scheduling
  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  // Targeting
  @Prop([String])
  categories?: string[]; // Show only on specific categories

  @Prop([String])
  tags?: string[]; // Show only on specific tags

  @Prop()
  targetDevice?: 'desktop' | 'mobile' | 'all';

  // Author
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  // SEO
  @Prop()
  seoTitle?: string;

  @Prop()
  seoDescription?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);

// Indexes
BannerSchema.index({ slug: 1 });
BannerSchema.index({ type: 1, status: 1 });
BannerSchema.index({ status: 1, priority: -1, order: 1 });
BannerSchema.index({ startDate: 1, endDate: 1 });
BannerSchema.index({ authorId: 1 });
BannerSchema.index({ categories: 1 });
BannerSchema.index({ tags: 1 });