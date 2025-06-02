import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ExternalUserService } from '../services/external-user.service';

@Injectable()
export class OptionalExternalUserGuard implements CanActivate {
  constructor(private externalUserService: ExternalUserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization) {
      // No token provided, but that's okay for optional guard
      return true;
    }

    const token = authorization.replace('Bearer ', '');
    if (!token) {
      return true;
    }

    try {
      // Try to validate token and attach user data
      const userData = await this.externalUserService.getUserFromGraphQL(token);
      request.externalUser = userData;
      return true;
    } catch (error) {
      // Token is invalid, but we still allow access (optional)
      return true;
    }
  }
}
