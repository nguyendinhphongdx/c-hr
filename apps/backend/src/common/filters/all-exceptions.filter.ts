import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

const ERROR_CODES_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

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
        code: ERROR_CODES_BY_STATUS[status] || 'INTERNAL_SERVER_ERROR',
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
