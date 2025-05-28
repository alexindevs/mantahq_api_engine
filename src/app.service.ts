import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '👋🏾 Hello from the MantaHQ Dynamic API Engine';
  }

  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  getMeta(): Record<string, string> {
    return {
      name: 'MantaHQ Dynamic API Engine',
      version: '1.0.0',
      author: 'Esther Ohiomame',
      description:
        'This service allows users to define and execute custom API logic with runtime validation in a sandboxed environment.',
    };
  }
}
