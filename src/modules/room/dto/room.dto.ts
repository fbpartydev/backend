import { IsNotEmpty, IsString, IsOptional, IsNumber, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({
    description: 'Nombre de la sala',
    example: 'Videos de Cumpleaños',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Descripción de la sala',
    example: 'Videos de la fiesta',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRoomDto {
  @ApiProperty({
    description: 'Nombre de la sala',
    example: 'Videos de Cumpleaños',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Descripción de la sala',
    example: 'Videos de la fiesta',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Estado activo de la sala',
    example: true,
    required: false,
  })
  @IsOptional()
  active?: boolean;
}

export class AddVideoDto {
  @ApiProperty({
    description: 'URL del video de Facebook',
    example: 'https://www.facebook.com/watch/?v=123456789',
  })
  @IsNotEmpty()
  @IsString()
  facebookUrl: string;
}

export class AddVideosDto {
  @ApiProperty({
    description: 'Array de URLs de videos de Facebook',
    example: ['https://www.facebook.com/watch/?v=123456789', 'https://www.facebook.com/watch/?v=987654321'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  facebookUrls: string[];
}

export class ProcessVideoDto {
  @ApiProperty({
    description: 'ID del video a procesar',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  videoId: number;
}
