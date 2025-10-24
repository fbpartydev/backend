import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ChangeAdminPassDto {
  @ApiPropertyOptional({
    description: 'Contraseña del admin',
    example: 'A123456',
  })
  @IsOptional()
  @IsString()
  password: string;
}
