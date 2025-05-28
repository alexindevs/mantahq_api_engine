import { Module } from '@nestjs/common';
import { ConfigModule } from './modules/config/config.module';
import { ApiModule } from './modules/api/api.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { SandboxModule } from './modules/sandbox/sandbox.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: process.env.THROTTLE_TTL ? parseInt(process.env.THROTTLE_TTL) : 60,
        limit: process.env.THROTTLE_LIMIT
          ? parseInt(process.env.THROTTLE_LIMIT)
          : 10,
      },
    ]),
    ConfigModule,
    SandboxModule,
    ApiModule,
  ],
})
export class AppModule {}
