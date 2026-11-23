export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'ehrm',
    password: process.env.DB_PASSWORD ?? 'ehrm123',
    database: process.env.DB_DATABASE ?? 'ehrm',
    synchronize: process.env.DB_SYNC === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  mail: {
    host: process.env.MAIL_HOST || undefined,
    port: parseInt(process.env.MAIL_PORT ?? '587', 10),
    user: process.env.MAIL_USER || undefined,
    pass: process.env.MAIL_PASS || undefined,
    from: process.env.MAIL_FROM || 'eHRM <no-reply@ehrm.local>',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
});
