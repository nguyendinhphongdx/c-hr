import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { RequestContextService } from './request-context.service';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls, req) => {
          cls.set('ip', req.ip || req.headers['x-forwarded-for']);
          cls.set('userAgent', req.headers['user-agent']);
        },
      },
    }),
  ],
  providers: [RequestContextService],
  exports: [RequestContextService],
})
export class ContextModule {}
