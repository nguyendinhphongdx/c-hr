/**
 * AccessException - typed error codes for access control / authorization.
 * Frontend can switch on `code` to redirect or show specific UI.
 */
import { HttpException, HttpStatus } from '@nestjs/common';

export enum AccessErrorCode {
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  INSUFFICIENT_ROLE = 'INSUFFICIENT_ROLE',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  INVALID_OPERATION = 'INVALID_OPERATION',
}

const ERROR_MESSAGES: Record<AccessErrorCode, string> = {
  [AccessErrorCode.AUTH_REQUIRED]: 'Authentication required. Please login.',
  [AccessErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please login again.',
  [AccessErrorCode.ACCOUNT_SUSPENDED]: 'Your account has been suspended.',
  [AccessErrorCode.INSUFFICIENT_ROLE]: 'You do not have permission to perform this action.',
  [AccessErrorCode.RESOURCE_NOT_FOUND]: 'The requested resource was not found.',
  [AccessErrorCode.INVALID_OPERATION]: 'This operation cannot be performed.',
};

const ERROR_STATUS: Record<AccessErrorCode, HttpStatus> = {
  [AccessErrorCode.AUTH_REQUIRED]: HttpStatus.UNAUTHORIZED,
  [AccessErrorCode.SESSION_EXPIRED]: HttpStatus.UNAUTHORIZED,
  [AccessErrorCode.ACCOUNT_SUSPENDED]: HttpStatus.FORBIDDEN,
  [AccessErrorCode.INSUFFICIENT_ROLE]: HttpStatus.FORBIDDEN,
  [AccessErrorCode.RESOURCE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [AccessErrorCode.INVALID_OPERATION]: HttpStatus.BAD_REQUEST,
};

export interface AccessExceptionResponse {
  error: AccessErrorCode;
  message: string;
  data?: Record<string, any>;
}

export class AccessException extends HttpException {
  constructor(
    public readonly code: AccessErrorCode,
    public readonly data?: Record<string, any>,
    customMessage?: string,
  ) {
    const message = customMessage || ERROR_MESSAGES[code];
    const status = ERROR_STATUS[code];
    const response: AccessExceptionResponse = {
      error: code,
      message,
      ...(data && { data }),
    };
    super(response, status);
  }

  getErrorCode(): AccessErrorCode {
    return this.code;
  }
}

export function isAccessException(error: unknown): error is AccessException {
  return error instanceof AccessException;
}

export const AccessErrors = {
  authRequired: () => new AccessException(AccessErrorCode.AUTH_REQUIRED),
  sessionExpired: () => new AccessException(AccessErrorCode.SESSION_EXPIRED),
  accountSuspended: () => new AccessException(AccessErrorCode.ACCOUNT_SUSPENDED),
  insufficientRole: (currentRole: string, requiredRoles: string[]) =>
    new AccessException(AccessErrorCode.INSUFFICIENT_ROLE, { currentRole, requiredRoles }),
  resourceNotFound: (resourceType?: string, resourceId?: string) =>
    new AccessException(AccessErrorCode.RESOURCE_NOT_FOUND, { resourceType, resourceId }),
};
