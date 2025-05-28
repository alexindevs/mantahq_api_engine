import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateConfigDto } from './dto/create-config.dto';

export interface ApiConfig {
  name: string;
  method: string;
  body: Record<string, any>;
  customValidation: string;
  createdAt: Date;
}

@Injectable()
export class ConfigService {
  private readonly configs = new Map<string, ApiConfig>();

  create(createConfigDto: CreateConfigDto): ApiConfig {
    if (this.configs.has(createConfigDto.name)) {
      throw new ConflictException(
        `Configuration with name '${createConfigDto.name}' already exists`,
      );
    }

    const config: ApiConfig = {
      ...createConfigDto,
      createdAt: new Date(),
    };

    this.configs.set(createConfigDto.name, config);
    return config;
  }

  findByName(name: string): ApiConfig {
    const config = this.configs.get(name);
    if (!config) {
      throw new NotFoundException(
        `Configuration with name '${name}' not found`,
      );
    }
    return config;
  }

  findAll(): ApiConfig[] {
    return Array.from(this.configs.values());
  }

  delete(name: string): boolean {
    return this.configs.delete(name);
  }

  exists(name: string): boolean {
    return this.configs.has(name);
  }
}
