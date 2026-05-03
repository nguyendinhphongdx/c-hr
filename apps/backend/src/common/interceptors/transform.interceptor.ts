import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
}

function serializeForJson(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === 'bigint') return Number(obj);

  // Prisma Decimal (has toNumber)
  if (obj && typeof obj === 'object' && typeof obj.toNumber === 'function') {
    return obj.toNumber();
  }

  if (Array.isArray(obj)) return obj.map(serializeForJson);

  if (typeof obj === 'object') {
    const out: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        out[key] = serializeForJson(obj[key]);
      }
    }
    return out;
  }

  return obj;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        const serialized = serializeForJson(data);
        if (serialized && typeof serialized === 'object' && 'success' in serialized) {
          return serialized;
        }
        return { success: true, data: serialized };
      }),
    );
  }
}
