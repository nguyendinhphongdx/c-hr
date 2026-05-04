import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.status || HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: exception.message || 'Internal server error',
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // 4xx are expected client mistakes (bad input, missing auth, not found)
    // — log at warn without the stack so the console stays readable.
    // 5xx are real bugs we want full visibility on.
    const line = `${request.method} ${request.url} | ${status} | ${exception.message}`;
    if (status >= 500) {
      this.logger.error(line, exception.stack);
    } else {
      this.logger.warn(line);
    }

    response.status(status).json(errorResponse);
  }
}
