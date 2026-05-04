import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestContextService } from '../context';

/**
 * OptionalAuthGuard - similar to JwtAuthGuard but does NOT throw on missing/invalid token.
 * Use when an endpoint should work for both authenticated and anonymous users.
 */
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly contextService: RequestContextService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) return null;
    this.contextService.set({
      userId: user.id,
      sessionId: user.sessionId,
      organizationId: user.organizationId,
    });
    return user;
  }
}
