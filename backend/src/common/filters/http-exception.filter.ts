import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Lỗi hệ thống';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
    } else if (exception instanceof QueryFailedError) {
      const code = (exception as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code;
      if (code === '23505') {
        status = HttpStatus.CONFLICT;
        message = 'Dữ liệu đã tồn tại';
      } else if (code === '23503') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Dữ liệu tham chiếu không hợp lệ';
      }
    }

    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    res.status(status).json({
      success: false,
      statusCode: status,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
