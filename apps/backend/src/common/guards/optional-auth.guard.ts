import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * OptionalAuthGuard - similar to JwtAuthGuard but does NOT throw on missing/invalid token.
 * Use when an endpoint should work for both authenticated and anonymous users.
 *
 * When a valid token is present, JwtStrategy.validate populates the
 * RequestContext (ADR 0007). When the token is missing or invalid,
 * passport never reaches validate, so ctx stays unset — services that
 * depend on it must handle the anonymous case explicitly.
 */
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) return null;
    return user;
  }
}
