import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { SandboxModule } from '../sandbox/sandbox.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [SandboxModule, ConfigModule],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
