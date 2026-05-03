import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const now = Date.now();

    this.logger.log(`→ ${method} ${url} | IP: ${ip}`);

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const delay = Date.now() - now;
        const statusCode = response.statusCode;
        const statusIcon = statusCode < 400 ? '✓' : '✗';
        this.logger.log(`← ${statusIcon} ${method} ${url} | Status: ${statusCode} | ${delay}ms`);
      }),
    );
  }
}
