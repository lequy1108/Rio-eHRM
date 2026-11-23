import { Global, Module } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { MailService } from './mail.service';

/** Các service tiện ích dùng chung cho mọi module (không cần import lại) */
@Global()
@Module({
  providers: [ExcelService, MailService],
  exports: [ExcelService, MailService],
})
export class SharedModule {}
