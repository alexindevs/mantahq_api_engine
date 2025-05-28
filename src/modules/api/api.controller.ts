import { Controller, Post, Param, Body, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiService } from './api.service';
import { Response } from '@nestjs/common';

@ApiTags('API')
@Controller('api')
export class ApiController {
  private readonly logger = new Logger(ApiController.name);

  constructor(private readonly apiService: ApiService) {}

  @Post(':name')
  @ApiOperation({
    summary: 'Trigger a dynamic API with user-defined validation',
  })
  @ApiParam({ name: 'name', example: 'email-validator' })
  @ApiBody({
    description: 'Request body to validate',
    examples: {
      valid: { value: { email: 'user@example.com', username: 'test' } },
      invalid: { value: { email: '' } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Validation succeeded',
    schema: {
      example: {
        success: true,
        processedMessage: 'Email is valid.',
        isValid: true,
        message: 'Email is valid.',
        timestamp: '2025-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (from user function)',
  })
  @ApiResponse({
    status: 404,
    description: 'Config not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Sandbox crash or execution error',
  })
  async trigger(
    @Param('name') name: string,
    @Body() body: Record<string, any>,
    @Response() response: any,
  ): Promise<any> {
    return response.status(200).send(await this.apiService.execute(name, body));
  }
}
