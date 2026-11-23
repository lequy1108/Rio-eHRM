import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUser {
  sub: string;
  email: string;
  roleId?: string | null;
  roleCode?: string | null;
  /** Mã quyền của vai trò; '*' = toàn quyền */
  permissions: string[];
  employeeId?: string | null;
}

export const CurrentUser = createParamDecorator(
  (field: keyof JwtUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user as JwtUser;
    return field ? user?.[field] : user;
  },
);
