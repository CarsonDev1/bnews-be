import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({
  timestamps: true,
  collection: 'categories',
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Category {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  icon?: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null })
  parentId?: Types.ObjectId | null;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  postCount: number;

  @Prop()
  seoTitle?: string;

  @Prop()
  seoDescription?: string;

  @Prop([String])
  seoKeywords?: string[];

  createdAt?: Date;
  updatedAt?: Date;

  children?: Category[];
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Indexes for performance
CategorySchema.index({ slug: 1 });
CategorySchema.index({ parentId: 1 });
CategorySchema.index({ isActive: 1, order: 1 });
CategorySchema.index({ postCount: -1 });

// FIXED: Virtual for children with proper configuration
CategorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId',
  justOne: false, // Important: This allows multiple children
  options: {
    sort: { order: 1, name: 1 },
    match: { isActive: true }, // Only get active children
  },
});

// FIXED: Ensure virtuals are included in JSON and Object outputs
CategorySchema.set('toJSON', { virtuals: true });
CategorySchema.set('toObject', { virtuals: true });
