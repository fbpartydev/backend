import { IsArray, IsNotEmpty, ValidateNested, IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CookieDto {
  @ApiProperty({
    description: 'Nombre de la cookie',
    example: 'c_user',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Valor de la cookie',
    example: '10001234567890',
  })
  @IsNotEmpty()
  @IsString()
  value: string;

  @ApiProperty({
    description: 'Dominio de la cookie',
    example: '.facebook.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiProperty({
    description: 'Ruta de la cookie',
    example: '/',
    required: false,
  })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({
    description: 'Fecha de expiración (Unix timestamp)',
    example: 1712345678,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  expires?: number;

  @ApiProperty({
    description: 'Fecha de expiración (Chrome export format)',
    example: 1712345678,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  expirationDate?: number;

  @ApiProperty({
    description: 'Cookie HTTP only',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  httpOnly?: boolean;

  @ApiProperty({
    description: 'Cookie segura',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  @ApiProperty({
    description: 'SameSite policy',
    example: 'Lax',
    enum: ['Strict', 'Lax', 'None', 'no_restriction', 'unspecified'],
    required: false,
  })
  @IsOptional()
  @IsString()
  sameSite?: 'Strict' | 'Lax' | 'None' | 'no_restriction' | 'unspecified';

  @ApiProperty({
    description: 'Host only cookie (Chrome export)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  hostOnly?: boolean;

  @ApiProperty({
    description: 'Session cookie (Chrome export)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  session?: boolean;

  @ApiProperty({
    description: 'Store ID (Chrome export)',
    required: false,
  })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiProperty({
    description: 'Cookie ID (Chrome export)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  id?: number;
}

export class UploadCookieDto {
  @ApiProperty({
    description: 'Array de cookies de Facebook',
    type: [CookieDto],
    example: [
      {
        name: 'c_user',
        value: '10001234567890',
        domain: '.facebook.com',
        path: '/',
        expires: 1712345678,
        httpOnly: true,
        secure: true,
      },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CookieDto)
  cookies: CookieDto[];
}

export class ExtractVideoDto {
  @ApiProperty({
    description: 'URL del video de Facebook',
    example: 'https://www.facebook.com/watch/?v=123456789',
  })
  @IsNotEmpty()
  @IsString()
  url: string;
}
