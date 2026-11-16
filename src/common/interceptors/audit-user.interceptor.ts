import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import { RequestContext } from '../context/request-context.js';

interface AuthenticatedRequest extends Request {
  user?: { id?: number; sub?: number };
}

@Injectable()
export class AuditUserInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id ?? request.user?.sub ?? null;

    return new Observable((subscriber) =>
      RequestContext.run(userId, () =>
        next.handle().subscribe(subscriber),
      ),
    );
  }
}
