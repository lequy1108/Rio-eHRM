import 'reflect-metadata';
import 'dotenv/config';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'ehrm',
  password: process.env.DB_PASSWORD ?? 'ehrm123',
  database: process.env.DB_DATABASE ?? 'ehrm',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
};

// Dùng cho TypeORM CLI (migration:generate / migration:run)
export default new DataSource(dataSourceOptions);
