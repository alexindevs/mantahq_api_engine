import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function NoEmptyKeysOrValues(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'noEmptyKeysOrValues',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== 'object' || value === null) return false;

          return Object.entries(value).every(
            ([key, val]) =>
              key.trim().length > 0 &&
              typeof val === 'string' &&
              val.trim().length > 0,
          );
        },
        defaultMessage(_args: ValidationArguments) {
          return `Body keys and values must be non-empty strings`;
        },
      },
    });
  };
}
