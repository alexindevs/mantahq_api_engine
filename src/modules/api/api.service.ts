import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService as AppConfigService } from '../config/config.service';
import {
  SandboxService,
  ValidationResult,
  SandboxExecutionResult,
} from '../sandbox/sandbox.service';

@Injectable()
export class ApiService {
  private readonly logger = new Logger(ApiService.name);

  constructor(
    private readonly configService: AppConfigService,
    private readonly sandboxService: SandboxService,
  ) {}

  async execute(name: string, requestBody: Record<string, any>): Promise<any> {
    const config = this.configService.findByName(name);
    if (!config) {
      throw new NotFoundException(`API config "${name}" not found`);
    }

    this.logger.log(
      `Executing API config "${name}" with body keys: [${Object.keys(requestBody).join(', ')}]`,
    );

    const expectedSchema = config?.body ?? {};
    const requestPayload = requestBody ?? {};

    if (typeof expectedSchema !== 'object' || Array.isArray(expectedSchema)) {
      throw new InternalServerErrorException(
        'Invalid config schema: body must be a plain object',
      );
    }

    if (typeof requestPayload !== 'object' || Array.isArray(requestPayload)) {
      throw new BadRequestException(
        'Invalid request: body must be a JSON object',
      );
    }

    // Extract expected and actual keys from schemas
    const expectedKeys = Object.keys(expectedSchema);
    const requestKeys = Object.keys(requestPayload);

    // Identify missing keys in the request payload
    const missingKeys = expectedKeys.filter(
      (key) => !requestKeys.includes(key),
    );

    // If there are missing keys, throw an error
    if (missingKeys.length > 0) {
      throw new BadRequestException({
        error: 'Missing required keys',
        message: `Missing keys: [${missingKeys.join(', ')}]`,
        expectedKeys,
      });
    }

    // Identify keys with invalid types in the request payload
    const invalidTypes = expectedKeys.filter((key) => {
      const expectedType = expectedSchema[key];
      const actualType = typeof requestPayload[key];
      return actualType !== expectedType;
    });

    // If there are invalid types, throw an error
    if (invalidTypes.length > 0) {
      throw new BadRequestException({
        error: 'Invalid types',
        message: `Invalid types for keys: [${invalidTypes.join(', ')}]`,
        expectedTypes: invalidTypes.map((key) => ({
          key,
          expectedType: expectedSchema[key],
          actualType: typeof requestPayload[key],
        })),
      });
    }

    const execution: SandboxExecutionResult =
      await this.sandboxService.executeValidation(config.customValidation, {
        body: requestBody,
      });

    if (!execution.success) {
      throw new InternalServerErrorException({
        error: 'Sandbox execution failed',
        message: execution.error,
        executionTime: execution.executionTime,
      });
    }

    const result = execution.result as ValidationResult;

    if (!result.isValid) {
      throw new BadRequestException({
        isValid: false,
        message: result.message,
      });
    }

    return this.sandboxService.predefinedNextActionFunction(result);
  }
}
