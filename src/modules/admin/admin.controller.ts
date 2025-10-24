import { Body, Controller, Param, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Crud, CrudController } from '@dataui/crud';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/createAdmin.dto';
import { LoginDto } from './dto/loginAdmin.dto';
import { UpdateAdminDto } from './dto/updateAdmin.dto';
import { ChangeAdminPassDto } from './dto/changeAdminPass.dto';
import { UploadCookieDto, ExtractVideoDto } from './dto/upload-cookie.dto';
import { AdminGuard } from 'src/core/guards/auth-admin.guard';
import { AdminEntity } from 'src/entities/admin.entity';
import { FacebookScraperService } from 'src/Services/facebook-scraper.service';

@Crud({
  model: {
    type: AdminEntity,
  },
  dto: {
    create: CreateAdminDto,
    update: UpdateAdminDto,
    replace: UpdateAdminDto,
  },
  query: {
    exclude: ['password'],
  },
  routes: {
    getManyBase: {
      interceptors: [],
      decorators: [ApiBearerAuth(), UseGuards(AdminGuard)],
    },
    getOneBase: {
      interceptors: [],
      decorators: [ApiBearerAuth(), UseGuards(AdminGuard)],
    },
    createOneBase: {
      interceptors: [],
      decorators: [],
    },
    createManyBase: {
      interceptors: [],
      decorators: [ApiBearerAuth(), UseGuards(AdminGuard)],
    },
    updateOneBase: {
      interceptors: [],
      decorators: [ApiBearerAuth(), UseGuards(AdminGuard)],
    },
    replaceOneBase: {
      interceptors: [],
      decorators: [ApiBearerAuth(), UseGuards(AdminGuard)],
    },
    deleteOneBase: {
      interceptors: [],
      decorators: [ApiBearerAuth(), UseGuards(AdminGuard)],
    },
  },
})
@Controller('admin')
@ApiTags('admin')
export class AdminController implements CrudController<AdminEntity> {
  constructor(
    public service: AdminService,
    private scraper: FacebookScraperService,
  ) {}

  @Post('login')
  async log(@Body() loginDTO: LoginDto): Promise<any> {
    return await this.service.login(loginDTO);
  }

  @Post(':id/change-password')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  async changePassword(
    @Param('id') id: number,
    @Body() changeAdminPassDto: ChangeAdminPassDto,
  ): Promise<any> {
    return await this.service.changePassword(id, changeAdminPassDto);
  }

  @Post('upload-cookie')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subir cookies de Facebook (encriptadas)' })
  @ApiResponse({ status: 200, description: 'Cookie guardada correctamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async uploadCookie(@Body() body: UploadCookieDto): Promise<any> {
    const result = await this.service.uploadCookie(body);
    const check = await this.scraper.validateCookie();
    return { ...result, validate: check };
  }

  @Post('validate-cookie')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validar si la cookie sigue siendo válida' })
  @ApiResponse({ status: 200, description: 'Resultado de validación' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async validateCookie(): Promise<any> {
    return await this.scraper.validateCookie();
  }

  @Post('extract-video')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Extraer URL de video de Facebook usando la cookie guardada' })
  @ApiResponse({ status: 200, description: 'URL del video extraída' })
  @ApiResponse({ status: 400, description: 'URL requerida' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async extractVideo(@Body() body: ExtractVideoDto): Promise<any> {
    const { url } = body;
    if (!url) throw new BadRequestException('url required');

    const result = await this.scraper.extractVideoUrlFromFacebook(url);
    
    // Si falla, podría ser cookie inválida
    if (!result.success && result.error?.includes('not logged')) {
      await this.scraper.markCookieAsInvalid();
    }
    
    return result;
  }
}
