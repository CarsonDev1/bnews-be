import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TagDocument = Tag & Document;

@Schema({
  timestamps: true,
  collection: 'tags',
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
export class Tag {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  color?: string;

  @Prop({ default: 0 })
  postCount: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  seoTitle?: string;

  @Prop()
  seoDescription?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TagSchema = SchemaFactory.createForClass(Tag);

TagSchema.index({ slug: 1 });
TagSchema.index({ isActive: 1 });
TagSchema.index({ postCount: -1 });
