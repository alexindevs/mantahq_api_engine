import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsIn, Matches } from 'class-validator';

export class CreateConfigDto {
  @ApiProperty({
    description: 'Unique name for the API configuration',
    example: 'user-validation',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'HTTP method (currently only POST supported)',
    example: 'POST',
    enum: ['POST'],
  })
  @IsString()
  @IsIn(['POST'])
  method: string;

  @ApiProperty({
    description: 'Expected request body structure and type',
    example: { email: 'string', username: 'string' },
  })
  @IsObject()
  body: Record<string, string>;

  @ApiProperty({
    description: 'Custom validation function as a string',
    example: `function customValidation(data) {
  const email = data.body.email;
  if (!email) {
    return { isValid: false, message: 'Email is required.' };
  }
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Email is invalid.' };
  }
  return { isValid: true, message: 'Email is valid.' };
}`,
  })
  @IsString()
  @Matches(/^function\s+customValidation\s*\([^)]*\)\s*\{[\s\S]*\}$/, {
    message:
      'customValidation must be a valid function string starting with "function customValidation", and it must return an object with "isValid" and "message" properties',
  })
  customValidation: string;
}
