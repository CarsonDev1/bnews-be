import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

export enum CommentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SPAM = 'spam',
}

@Schema({
  timestamps: true,
  collection: 'comments',
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
export class Comment {
  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Comment', default: null })
  parentId?: Types.ObjectId | null; // For nested replies

  // External User Information (from GraphQL API)
  @Prop({ required: true })
  externalUserId: string; // Customer ID from GraphQL

  @Prop({ required: true })
  authorName: string; // Customer firstname + lastname

  @Prop({ required: true })
  authorEmail: string; // Customer email

  @Prop()
  authorAvatar?: string; // Customer picture

  @Prop()
  authorMobile?: string; // Customer mobile_number

  @Prop()
  authorRanking?: string; // Customer ranking info

  // Comment metadata
  @Prop({ enum: CommentStatus, default: CommentStatus.PENDING })
  status: CommentStatus;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ default: 0 })
  replyCount: number;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ default: false })
  isEdited: boolean;

  @Prop({ type: Date })
  editedAt?: Date;

  // Moderation
  @Prop()
  moderatedBy?: string; // Admin/moderator who approved/rejected

  @Prop({ type: Date })
  moderatedAt?: Date;

  @Prop()
  moderationReason?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Indexes for performance
CommentSchema.index({ postId: 1, status: 1, createdAt: -1 });
CommentSchema.index({ externalUserId: 1 });
CommentSchema.index({ parentId: 1 });
CommentSchema.index({ status: 1 });
CommentSchema.index({ createdAt: -1 });

// Virtual for replies
CommentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
});
