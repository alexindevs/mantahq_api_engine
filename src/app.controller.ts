import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Hello endpoint',
    description: 'Basic sanity check with a hello message.',
  })
  @ApiResponse({ status: 200, description: 'Returns hello message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Healthcheck',
    description: 'Check if the app is up and running',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns status and timestamp',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2025-05-27T09:00:00.000Z',
      },
    },
  })
  getHealth(): { status: string; timestamp: string } {
    return this.appService.getHealth();
  }

  @Get('meta')
  @ApiOperation({
    summary: 'Service Metadata',
    description: 'Returns version, author, and description',
  })
  @ApiResponse({
    status: 200,
    description: 'Service metadata',
    schema: {
      example: {
        name: 'MantaHQ Dynamic API Engine',
        version: '1.0.0',
        author: 'Esther Ohiomame',
        description:
          'This service allows users to define and execute custom API logic with runtime validation in a sandboxed environment.',
      },
    },
  })
  getMeta(): Record<string, string> {
    return this.appService.getMeta();
  }
}
