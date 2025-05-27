import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Exclude } from 'class-transformer';

export type UserDocument = User & Document;

export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
}

@Schema({
  timestamps: true,
  collection: 'users',
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, trim: true })
  username: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, minlength: 6 })
  @Exclude({ toPlainOnly: true })
  password: string;

  @Prop({ trim: true })
  firstName?: string;

  @Prop({ trim: true })
  lastName?: string;

  @Prop({ trim: true })
  displayName?: string;

  @Prop()
  avatar?: string;

  @Prop({ trim: true, maxlength: 500 })
  bio?: string;

  @Prop()
  website?: string;

  @Prop()
  location?: string;

  @Prop({ type: Date })
  dateOfBirth?: Date;

  @Prop({ enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop({ default: 0 })
  postCount: number;

  @Prop({ default: 0 })
  commentCount: number;

  @Prop({ default: 0 })
  followerCount: number;

  @Prop({ default: 0 })
  followingCount: number;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ type: Date })
  emailVerifiedAt?: Date;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  passwordResetToken?: string;

  @Prop({ type: Date })
  passwordResetExpires?: Date;

  @Prop({ default: true })
  isEmailNotificationEnabled: boolean;

  @Prop({ default: true })
  isProfilePublic: boolean;

  @Prop()
  seoTitle?: string;

  @Prop()
  seoDescription?: string;

  createdAt?: Date;
  updatedAt?: Date;
  _id: any;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ postCount: -1 });
UserSchema.index({ createdAt: -1 });

UserSchema.index(
  {
    username: 'text',
    displayName: 'text',
    firstName: 'text',
    lastName: 'text',
    bio: 'text',
  },
  {
    weights: {
      username: 10,
      displayName: 8,
      firstName: 5,
      lastName: 5,
      bio: 1,
    },
  },
);

UserSchema.virtual('fullName').get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.displayName || this.username;
});
