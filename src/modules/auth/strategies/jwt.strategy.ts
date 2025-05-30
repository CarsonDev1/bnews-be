import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'your-super-secret-jwt-key',
    });
  }

  async validate(payload: any) {
    try {
      // FIX: Ensure we only return simple string/primitive values
      const user = await this.authService.validateUser(payload);

      return {
        id: user._id.toString(), // Convert ObjectId to string
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
