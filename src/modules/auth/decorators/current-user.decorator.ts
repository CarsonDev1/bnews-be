import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    if (data) {
      if (data === 'id') {
        if (typeof user.id === 'string') {
          return user.id;
        } else if (user.id && typeof user.id === 'object' && user.id._id) {
          return user.id._id.toString();
        } else if (user.id && typeof user.id === 'object' && user.id.toString) {
          return user.id.toString();
        } else if (user._id) {
          return user._id.toString();
        }
        return user.id;
      }
      return user[data];
    }

    return user;
  },
);

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    if (data) {
      return user[data];
    }

    return user;
  },
);
