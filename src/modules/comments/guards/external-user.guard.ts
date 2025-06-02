import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ExternalUserService } from '../services/external-user.service';

@Injectable()
export class ExternalUserGuard implements CanActivate {
  constructor(private externalUserService: ExternalUserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Bearer token is required');
    }

    try {
      // Validate token by fetching user data
      const userData = await this.externalUserService.getUserFromGraphQL(token);

      // Attach user data to request for use in controllers
      request.externalUser = userData;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid external user token');
    }
  }
}
