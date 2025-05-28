import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Server } from 'http';

// Define interfaces for type safety
interface ConfigResponse {
  name: string;
  method: string;
  createdAt: string;
  body?: Record<string, any>;
}

interface ValidationResponse {
  success: boolean;
  processedMessage: string;
  timestamp: string;
}

interface ErrorResponse {
  isValid: boolean;
  message: string;
}

interface SecurityErrorResponse {
  error: string;
  message: string;
}

describe('MantaHQ Dynamic API Engine (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/config (POST)', () => {
    it('should create a valid configuration', () => {
      const validConfig = {
        name: 'test-api',
        method: 'POST',
        body: { email: '', username: '' },
        customValidation: `function customValidation(data) {
          const email = data.body.email;
          if (!email) {
            return { isValid: false, message: 'Email is required.' };
          }
          return { isValid: true, message: 'Email is valid.' };
        }`,
      };

      return request(app.getHttpServer() as Server)
        .post('/config')
        .send(validConfig)
        .expect(201)
        .expect((res) => {
          const body = res.body as ConfigResponse;
          expect(body.name).toBe('test-api');
          expect(body.method).toBe('POST');
          expect(body.createdAt).toBeDefined();
        });
    });

    it('should reject invalid customValidation', () => {
      const invalidConfig = {
        name: 'invalid-api',
        method: 'POST',
        body: { email: '' },
        customValidation: 'not a function',
      };

      return request(app.getHttpServer() as Server)
        .post('/config')
        .send(invalidConfig)
        .expect(400);
    });

    it('should reject duplicate configuration names', async () => {
      const config = {
        name: 'duplicate-test',
        method: 'POST',
        body: { email: '' },
        customValidation: `function customValidation(data) {
          return { isValid: true, message: 'OK' };
        }`,
      };

      // Create first config
      await request(app.getHttpServer() as Server)
        .post('/config')
        .send(config)
        .expect(201);

      // Try to create duplicate
      return request(app.getHttpServer() as Server)
        .post('/config')
        .send(config)
        .expect(409);
    });
  });

  describe('/api/:name (POST)', () => {
    beforeEach(async () => {
      const config = {
        name: 'email-validator',
        method: 'POST',
        body: { email: 'string', username: 'string' },
        customValidation: `function customValidation(data) {
          const email = data.body.email;
          if (!email) {
            return { isValid: false, message: 'Email is required.' };
          }
          const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
          if (!emailRegex.test(email)) {
            return { isValid: false, message: 'Email is invalid.' };
          }
          return { isValid: true, message: 'Email is valid.', processedEmail: email.toLowerCase() };
        }`,
      };

      // // Step 1: Simplest possible output
      // const config = {
      //   name: 'email-validator',
      //   method: 'POST',
      //   body: { email: '', username: '' },
      //   customValidation: `function customValidation(data) {
      //     // Simplest possible valid return
      //     return { isValid: true, message: 'Hardcoded success from isolate' };
      //   }`,
      // };

      await request(app.getHttpServer() as Server)
        .post('/config')
        .send(config)
        .expect(201);
    });

    it('should execute validation successfully with valid data', () => {
      return request(app.getHttpServer() as Server)
        .post('/api/email-validator')
        .send({ email: 'test@example.com', username: 'testuser' })
        .expect(200)
        .expect((res) => {
          const body = res.body as ValidationResponse;
          expect(body.success).toBe(true);
          expect(body.processedMessage).toBe('Email is valid.');
          expect(body.timestamp).toBeDefined();
        });
    });

    it('should return validation error with invalid data', () => {
      return request(app.getHttpServer() as Server)
        .post('/api/email-validator')
        .send({ email: '', username: 'testuser' })
        .expect(400)
        .expect((res) => {
          const body = res.body as ErrorResponse;
          expect(body.isValid).toBe(false);
          expect(body.message).toBe('Email is required.');
        });
    });

    it('should handle non-existent API configuration', () => {
      return request(app.getHttpServer() as Server)
        .post('/api/non-existent')
        .send({ data: 'test' })
        .expect(404);
    });
  });

  describe('Security Tests', () => {
    beforeEach(async () => {
      const maliciousConfig = {
        name: 'security-test',
        method: 'POST',
        body: { input: 'string' },
        customValidation: `function customValidation(data) {
          // Let this throw and be caught by SandboxService's outer catch
          process.exit(1); 
          // The following lines will not be reached if process.exit throws:
          // try {
          //   process.exit(1);
          // } catch (e) {
          //   return { isValid: false, message: 'Security violation blocked' };
          // }
          return { isValid: true, message: 'Should not reach here' };
        }`,
      };

      await request(app.getHttpServer() as Server)
        .post('/config')
        .send(maliciousConfig)
        .expect(201); //
    });

    it('should block access to process object', () => {
      return request(app.getHttpServer() as Server)
        .post('/api/security-test')
        .send({ input: 'test' })
        .expect(500) //
        .expect((res) => {
          const body = res.body as SecurityErrorResponse; //
          expect(body.error).toBe('Sandbox execution failed'); //
          // Now, with improved logging, check the actual error message for "process"
          // This assertion might need adjustment based on the exact error message from isolated-vm
          expect(body.message).toMatch(/process|is not defined/i);
        });
    });
  });

  describe('Timeout Tests', () => {
    beforeEach(async () => {
      const timeoutConfig = {
        name: 'timeout-test',
        method: 'POST',
        body: { input: 'string' },
        customValidation: `function customValidation(data) {
          while (true) {
            // Infinite loop to test timeout
          }
          return { isValid: true, message: 'Should timeout' };
        }`,
      };

      await request(app.getHttpServer() as Server)
        .post('/config')
        .send(timeoutConfig)
        .expect(201);
    });

    it('should timeout infinite loops', () => {
      return request(app.getHttpServer() as Server)
        .post('/api/timeout-test')
        .send({ input: 'test' })
        .expect(500)
        .expect((res) => {
          const body = res.body as { message: string };
          expect(body.message).toContain('timed out');
        });
    }, 10000); // Increase timeout for this test
  });
});
