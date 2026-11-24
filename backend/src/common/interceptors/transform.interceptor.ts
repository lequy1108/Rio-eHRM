import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { map, Observable } from 'rxjs';

/** Chuẩn hoá response thành { success: true, data }; file tải về (StreamableFile) giữ nguyên */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { success: true; data: T } | StreamableFile> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<{ success: true; data: T } | StreamableFile> {
    return next.handle().pipe(map((data) => (data instanceof StreamableFile ? data : { success: true as const, data })));
  }
}
