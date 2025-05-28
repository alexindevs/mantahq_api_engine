import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ConfigService, ApiConfig } from './config.service';
import { CreateConfigDto } from './dto/create-config.dto';

@ApiTags('config')
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API configuration' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Configuration created successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Configuration with this name already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid configuration data',
  })
  @ApiBody({
    type: CreateConfigDto,
    examples: {
      emailValidation: {
        summary: 'Email Validation API',
        description: 'A simple email validation configuration',
        value: {
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
        },
      },
    },
  })
  create(@Body() createConfigDto: CreateConfigDto): ApiConfig {
    return this.configService.create(createConfigDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all API configurations' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all configurations',
  })
  findAll(): ApiConfig[] {
    return this.configService.findAll();
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get a specific API configuration by name' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration found',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Configuration not found',
  })
  findOne(@Param('name') name: string): ApiConfig {
    return this.configService.findByName(name);
  }

  @Delete(':name')
  @ApiOperation({ summary: 'Delete an API configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Configuration not found',
  })
  remove(@Param('name') name: string): { deleted: boolean } {
    const deleted = this.configService.delete(name);
    return { deleted };
  }
}
