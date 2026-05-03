import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
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

    this.logger.error(
      `Unhandled Exception | ${request.method} ${request.url} | Status: ${status} | Error: ${exception.message}`,
      exception.stack,
    );

    response.status(status).json(errorResponse);
  }
}
