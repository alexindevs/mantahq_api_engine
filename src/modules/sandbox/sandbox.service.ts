import { Injectable, Logger } from '@nestjs/common';
const ivm: typeof import('isolated-vm') = require('isolated-vm');

export interface ValidationResult {
  isValid: boolean;
  message: string;
  [key: string]: any;
}

export interface SandboxExecutionResult {
  success: boolean;
  result?: ValidationResult;
  error?: string;
  executionTime: number;
}

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);
  private readonly timeout = parseInt(process.env.SANDBOX_TIMEOUT_MS || '100');
  private readonly memoryLimit = parseInt(
    process.env.SANDBOX_MAX_MEMORY_MB || '8',
  );

  async executeValidation(
    validationCode: string,
    data: { body: Record<string, any> },
  ): Promise<SandboxExecutionResult> {
    const start = Date.now(); // Capture start time for execution time calculation

    try {
      // Initialize an isolate with memory limits to sandbox the execution
      const isolate = new ivm.Isolate({ memoryLimit: this.memoryLimit });
      const context = await isolate.createContext();

      // Jail the global scope to prevent access to Node internals
      const jail = context.global;
      await jail.set('global', jail.derefInto());

      // Sanitize and freeze the input data to prevent modifications
      const sanitizedData = {
        body: JSON.parse(JSON.stringify(data.body || {})),
      };
      Object.freeze(sanitizedData);

      // Set the frozen data in the sandboxed environment
      await jail.set(
        'data',
        new ivm.ExternalCopy(sanitizedData).copyInto({ release: true }),
      );

      // Append validation code and ensure it's a function before executing
      const fullCode = `
        ${validationCode}
        if (typeof customValidation !== 'function') {
          throw new Error('customValidation is not a function');
        }
        (function() {
          return JSON.stringify(customValidation(data));
        })();
      `;

      // Compile and run the script within the isolated context
      const script = await isolate.compileScript(fullCode);

      const result = JSON.parse(
        await script.run(context, {
          timeout: this.timeout, // Execution timeout for the script
          result: { copy: true },
        }),
      ) as ValidationResult;

      const executionTime = Date.now() - start; // Calculate execution time

      // Validate the result shape
      if (!this.isValidResult(result)) {
        return {
          success: false,
          error:
            'Validation function must return an object with isValid and message.',
          executionTime,
        };
      }

      return {
        success: true,
        result,
        executionTime,
      };
    } catch (err) {
      const executionTime = Date.now() - start;
      this.logger.error('Sandbox execution caught an error:', err);

      // Determine appropriate error message
      let errorMsg = 'Unknown Error';
      if (err instanceof Error) {
        errorMsg = err.message;
        if (
          err.message &&
          (err.message.toLowerCase().includes('timeout') ||
            err.message.toLowerCase().includes('script execution timed out'))
        ) {
          errorMsg = 'Script execution timed out';
        }
      } else if (typeof err === 'string') {
        errorMsg = err;
        if (
          err.toLowerCase().includes('timeout') ||
          err.toLowerCase().includes('script execution timed out')
        ) {
          errorMsg = 'Script execution timed out';
        }
      } else if (err && typeof err.toString === 'function') {
        errorMsg = (err as any).toString();
      }

      // Log the error details
      this.logger.warn(`Execution failed. Reported error: "${errorMsg}"`, {
        originalErrorDetails: err,
        executionTime,
      });

      return {
        success: false,
        error: errorMsg,
        executionTime,
      };
    }
  }

  private isValidResult(result: {
    isValid: boolean;
    message: string;
  }): result is ValidationResult {
    return (
      result &&
      typeof result === 'object' &&
      typeof result.isValid === 'boolean' &&
      typeof result.message === 'string'
    );
  }

  predefinedNextActionFunction(result: ValidationResult): any {
    return {
      success: true,
      processedMessage: result.message,
      timestamp: new Date().toISOString(),
      ...result,
    };
  }
}
