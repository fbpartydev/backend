import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail } from 'class-validator';
import { AdminRole } from '../enum/admin-role.enum';

export class UpdateAdminDto {
  @ApiPropertyOptional({
    description: 'Nombre del admin',
    example: 'Juanito admin',
  })
  @IsOptional()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Contraseña del admin',
    example: 'A123456',
  })
  @IsOptional()
  @IsString()
  password: string;

  @ApiPropertyOptional({
    description: 'Rol del admin',
    example: AdminRole.ADMIN,
    enum: AdminRole,
  })
  @IsOptional()
  @IsString()
  role: string;

  @ApiPropertyOptional({
    description: 'Identificador de identidad',
    example: '11.111.111-1',
  })
  @IsOptional()
  @IsString()
  identification: string;

  @ApiPropertyOptional({
    description: 'Email del admin',
    example: 'juanito@gmail.com',
  })
  @IsOptional()
  @IsEmail()
  email: string;
}
