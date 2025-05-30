import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserDocument } from '../../schemas/user.schema';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '../../schemas/refresh-token.schema';
import {
  UserActivity,
  UserActivityDocument,
  ActivityType,
} from '../../schemas/user-activity.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(UserActivity.name)
    private userActivityModel: Model<UserActivityDocument>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<UserDocument> {
    const existingUser = await this.userModel.findOne({
      $or: [{ email: registerDto.email }, { username: registerDto.username }],
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email or username already exists',
      );
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    const user = new this.userModel({
      ...registerDto,
      password: hashedPassword,
      displayName:
        registerDto.displayName ||
        `${registerDto.firstName || ''} ${registerDto.lastName || ''}`.trim() ||
        registerDto.username,
      emailVerificationToken: crypto.randomBytes(32).toString('hex'),
    });

    const savedUser = await user.save();

    await this.logActivity(
      (savedUser._id as Types.ObjectId).toString(),
      ActivityType.LOGIN,
      'User registered',
    );

    return savedUser;
  }

  async login(
    loginDto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserDocument;
    expiresIn: number;
  }> {
    const user = await this.userModel.findOne({ email: loginDto.email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is inactive or banned');
    }

    const tokens = await this.generateTokens(user, userAgent, ipAddress);

    await this.userModel.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
    });

    await this.logActivity(
      (user._id as Types.ObjectId).toString(),
      ActivityType.LOGIN,
      'User logged in',
      {
        userAgent,
        ipAddress,
      },
    );

    return {
      ...tokens,
      user,
      expiresIn: 7 * 24 * 60 * 60,
    };
  }

  async refreshToken(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const tokenDoc = await this.refreshTokenModel
      .findOne({ token: refreshToken, isRevoked: false })
      .populate('userId');

    if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Type assertion with proper check
    if (
      !tokenDoc.userId ||
      typeof tokenDoc.userId === 'string' ||
      tokenDoc.userId instanceof Types.ObjectId
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = tokenDoc.userId as UserDocument;

    await this.refreshTokenModel.findByIdAndUpdate(tokenDoc._id, {
      isRevoked: true,
    });

    const tokens = await this.generateTokens(user, userAgent, ipAddress);

    return {
      ...tokens,
      expiresIn: 7 * 24 * 60 * 60,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenModel.findOneAndUpdate(
      { token: refreshToken },
      { isRevoked: true },
    );
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      saltRounds,
    );

    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });

    await this.refreshTokenModel.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true },
    );

    await this.logActivity(userId, ActivityType.LOGIN, 'Password changed');
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const user = await this.userModel.findOne({
      email: forgotPasswordDto.email,
    });
    if (!user) return;

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000);

    await this.userModel.findByIdAndUpdate(user._id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    // TODO: Send email
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const user = await this.userModel.findOne({
      passwordResetToken: resetPasswordDto.token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      resetPasswordDto.newPassword,
      saltRounds,
    );

    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
    });

    await this.refreshTokenModel.updateMany(
      { userId: user._id, isRevoked: false },
      { isRevoked: true },
    );

    await this.logActivity(
      (user._id as Types.ObjectId).toString(),
      ActivityType.LOGIN,
      'Password reset',
    );
  }

  async validateUser(payload: any): Promise<User> {
    // FIX: Extract user ID properly from JWT payload
    let userId: string;

    if (typeof payload.sub === 'string') {
      userId = payload.sub;
    } else if (payload.sub && payload.sub._id) {
      userId = payload.sub._id.toString();
    } else if (payload.sub && typeof payload.sub === 'object') {
      userId = payload.sub.toString();
    } else {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(userId)) {
      throw new UnauthorizedException('Invalid user ID in token');
    }

    const user = await this.userModel
      .findById(userId)
      .select(
        '-password -emailVerificationToken -passwordResetToken -avatarPublicId',
      )
      .exec();

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  async getCurrentUser(userId: any): Promise<User> {
    // FIX: Ensure userId is a string and valid ObjectId
    let cleanUserId: string;

    if (typeof userId === 'string') {
      cleanUserId = userId;
    } else if (userId && typeof userId === 'object') {
      // Handle case where userId might be an object
      if (userId._id) {
        cleanUserId = userId._id.toString();
      } else if (userId.toString) {
        cleanUserId = userId.toString();
      } else {
        throw new UnauthorizedException('Invalid user ID format');
      }
    } else {
      throw new UnauthorizedException('User ID is required');
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(cleanUserId)) {
      throw new UnauthorizedException('Invalid user ID format');
    }

    const user = await this.userModel
      .findById(cleanUserId)
      .select(
        '-password -emailVerificationToken -passwordResetToken -avatarPublicId',
      )
      .exec();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is inactive or banned');
    }

    return user;
  }

  private async generateTokens(
    user: User,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = {
      sub: user._id.toString(), // Ensure string conversion
      email: user.email,
      role: user.role,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Save refresh token
    await this.refreshTokenModel.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: refreshTokenExpires,
      userAgent,
      ipAddress,
    });

    return { accessToken, refreshToken };
  }

  private async logActivity(
    userId: string,
    type: ActivityType,
    description?: string,
    metadata?: any,
  ): Promise<void> {
    await this.userActivityModel.create({
      userId,
      type,
      description,
      metadata,
    });
  }
}
