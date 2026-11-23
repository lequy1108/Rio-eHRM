import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditModule } from './common/audit/audit.module';
import { RequestContextInterceptor } from './common/audit/request-context';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SharedModule } from './common/shared/shared.module';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogsModule } from './modules/catalogs/catalogs.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { HealthController } from './modules/health/health.controller';
import { PositionsModule } from './modules/positions/positions.module';
import { RolesModule } from './modules/roles/roles.module';
import { SettingsModule } from './modules/settings/settings.module';
import { CustomFieldsModule } from './modules/custom-fields/custom-fields.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    SharedModule,
    AuditModule,
    SettingsModule,
    RolesModule,
    CustomFieldsModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    PositionsModule,
    EmployeesModule,
    CatalogsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Mặc định mọi route đều cần đăng nhập, dùng @Public() để mở
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Lưu người dùng hiện tại cho audit log (chạy sau guard)
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
