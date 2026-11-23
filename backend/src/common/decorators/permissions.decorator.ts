import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../permissions';

export const PERMISSIONS_KEY = 'permissions';
/** Route cần đủ các quyền này, ví dụ @Permissions('employees.update') */
export const Permissions = (...perms: Permission[]) => SetMetadata(PERMISSIONS_KEY, perms);
