import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { AdminRole } from '../enum/admin-role.enum';

export class CreateAdminDto {
  @ApiProperty({
    description: 'Nombre del admin',
    example: 'Juanito admin',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Contraseña del admin',
    example: 'A123456',
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({
    description: 'Rol del admin',
    example: AdminRole.ADMIN,
    enum: AdminRole,
  })
  @IsNotEmpty()
  @IsString()
  role: string;

  @ApiPropertyOptional({
    description: 'Identificador de identidad',
    example: '11.111.111-1',
  })
  @IsOptional()
  @IsString()
  identification: string;

  @ApiProperty({
    description: 'Email del admin',
    example: 'juanito@gmail.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
