import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';

/** Thư mục gốc lưu file, phục vụ tĩnh tại /uploads */
export const UPLOAD_ROOT = join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

export const FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  excel: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream',
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
  ],
};

/**
 * Cấu hình multer dùng chung.
 *   @UseInterceptors(FileInterceptor('file', uploadOptions({ folder: 'avatars', types: FILE_TYPES.image, maxSizeMB: 2 })))
 * Không truyền folder = giữ file trong bộ nhớ (dùng cho import Excel).
 */
export function uploadOptions(opts: { folder?: string; types?: string[]; maxSizeMB?: number }): MulterOptions {
  const { folder, types, maxSizeMB = 5 } = opts;
  return {
    storage: folder
      ? diskStorage({
          destination: (_req, _file, cb) => {
            const dir = join(UPLOAD_ROOT, folder);
            mkdirSync(dir, { recursive: true });
            cb(null, dir);
          },
          filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
        })
      : memoryStorage(),
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (types && !types.includes(file.mimetype)) {
        return cb(new BadRequestException(`Định dạng file không hợp lệ (${file.mimetype})`), false);
      }
      cb(null, true);
    },
  };
}

/** Đường dẫn công khai của file đã lưu, vd /uploads/avatars/abc.png */
export function publicPath(folder: string, filename: string) {
  return `/uploads/${folder}/${filename}`;
}
