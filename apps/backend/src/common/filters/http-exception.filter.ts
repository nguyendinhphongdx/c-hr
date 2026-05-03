import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      success: false,
      error: {
        code: this.getErrorCode(exception),
        message: this.getErrorMessage(exceptionResponse),
        details: this.getErrorDetails(exceptionResponse),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.error(
      `HTTP Exception | ${request.method} ${request.url} | Status: ${status} | Error: ${errorResponse.error.message}`,
      exception.stack,
    );

    response.status(status).json(errorResponse);
  }

  private getErrorCode(exception: HttpException): string {
    const status = exception.getStatus();
    const name = exception.constructor.name;

    const errorCodes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
    };

    return errorCodes[status] || name.replace('Exception', '').toUpperCase();
  }

  private getErrorMessage(response: any): string {
    if (typeof response === 'string') return response;
    if (response?.message) {
      if (Array.isArray(response.message)) return 'Validation failed';
      return response.message;
    }
    return 'An error occurred';
  }

  private getErrorDetails(response: any): any {
    if (typeof response === 'object') {
      const { message, error, statusCode, errors, ...details } = response;
      if (errors && Array.isArray(errors)) return { fields: errors };
      if (Array.isArray(message) && message.length > 0) return { validationErrors: message };
      return Object.keys(details).length > 0 ? details : undefined;
    }
    return undefined;
  }
}
