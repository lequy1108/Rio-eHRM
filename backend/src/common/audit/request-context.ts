import { AsyncLocalStorage } from 'async_hooks';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { JwtUser } from '../decorators/current-user.decorator';

interface RequestStore {
  user?: JwtUser;
  ip?: string;
}

/** Lưu người dùng của request hiện tại để service nào cũng lấy được (vd ghi audit log) */
export const requestContext = new AsyncLocalStorage<RequestStore>();

export const currentUser = () => requestContext.getStore()?.user;

/** Chạy sau guard (đã có req.user), bọc toàn bộ xử lý request trong context */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const store: RequestStore = { user: req.user, ip: req.ip };
    return new Observable((subscriber) => {
      requestContext.run(store, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
