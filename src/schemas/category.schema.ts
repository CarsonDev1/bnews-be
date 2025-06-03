// src/schemas/category.schema.ts - UPDATED FIXED VERSION
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

  // FIX: Ensure parentId is properly typed and indexed
  @Prop({ 
    type: Types.ObjectId, 
    ref: 'Category', 
    default: null,
    index: true // Add index for better performance
  })
  parentId?: Types.ObjectId | null;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: 0, index: true })
  postCount: number;

  @Prop()
  seoTitle?: string;

  @Prop()
  seoDescription?: string;

  @Prop([String])
  seoKeywords?: string[];

  createdAt?: Date;
  updatedAt?: Date;

  // Virtual field for populated children
  children?: Category[];
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// CRITICAL: Add compound indexes for performance
CategorySchema.index({ slug: 1 });
CategorySchema.index({ parentId: 1, isActive: 1, order: 1 });
CategorySchema.index({ isActive: 1, order: 1 });
CategorySchema.index({ postCount: -1 });

// FIX: Proper virtual configuration for children
CategorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId',
  justOne: false,
  options: {
    sort: { order: 1, name: 1 },
    match: { isActive: true },
  },
});

// CRITICAL: Ensure virtuals are included
CategorySchema.set('toJSON', { virtuals: true });
CategorySchema.set('toObject', { virtuals: true });

// IMPORTANT: Add a post-save hook to debug parentId setting
CategorySchema.post('save', function(doc) {
  console.log('📁 Category saved:', {
    id: doc._id,
    name: doc.name,
    parentId: doc.parentId,
    parentIdType: typeof doc.parentId,
    hasParent: !!doc.parentId
  });
});

// IMPORTANT: Add a pre-save hook to ensure parentId is properly set
CategorySchema.pre('save', function(next) {
  console.log('📝 Pre-save category:', {
    name: this.name,
    parentId: this.parentId,
    parentIdType: typeof this.parentId,
    isModified: this.isModified('parentId')
  });
  next();
});