import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserActivityDocument = UserActivity & Document;

export enum ActivityType {
  POST_CREATED = 'post_created',
  POST_UPDATED = 'post_updated',
  POST_DELETED = 'post_deleted',
  COMMENT_CREATED = 'comment_created',
  LIKE_GIVEN = 'like_given',
  USER_FOLLOWED = 'user_followed',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

@Schema({
  timestamps: true,
  collection: 'user_activities',
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
export class UserActivity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ enum: ActivityType, required: true })
  type: ActivityType;

  @Prop({ trim: true })
  description?: string;

  // FIX: Use Schema.Types.Mixed instead of Types.Mixed
  @Prop({ type: Object })
  metadata?: any;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserActivitySchema = SchemaFactory.createForClass(UserActivity);

// Indexes
UserActivitySchema.index({ userId: 1, createdAt: -1 });
UserActivitySchema.index({ type: 1 });
UserActivitySchema.index({ createdAt: -1 });

// Auto-delete old activities (keep for 6 months)
UserActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 15552000 });
