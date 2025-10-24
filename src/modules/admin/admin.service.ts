import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Repository } from 'typeorm';
import { AdminEntity } from '../../entities/admin.entity';
import { FacebookCookie } from '../../entities/facebook-cookie.entity';
import { LoginDto } from './dto/loginAdmin.dto';
import { ChangeAdminPassDto } from './dto/changeAdminPass.dto';
import { UploadCookieDto } from './dto/upload-cookie.dto';
import { encrypt } from '../../utils/crypto.util';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService extends TypeOrmCrudService<AdminEntity> {
  constructor(
    @InjectRepository(AdminEntity) repo: Repository<AdminEntity>,
    @InjectRepository(FacebookCookie)
    private cookieRepo: Repository<FacebookCookie>,
  ) {
    super(repo);
  }

  async login(loginAdminDto: LoginDto) {
    const e = loginAdminDto.email.toLocaleLowerCase();
    const admin: AdminEntity | null = await this.repo
      .createQueryBuilder('admin')
      .where('admin.email = :id', { id: e })
      .getOne();
    if (admin) {
      if (await admin.comparePassword(loginAdminDto.password)) {
        return admin.toResponseObject();
      } else {
        throw new HttpException(
          'Contraseña incorrecta',
          HttpStatus.UNAUTHORIZED,
        );
      }
    } else {
      throw new HttpException('No existe esta cuenta', HttpStatus.NOT_FOUND);
    }
  }

  async changePassword(adminId: number, dto: ChangeAdminPassDto) {
    const admin: AdminEntity | null = await this.repo.findOne({
      where: { id: adminId },
    });
    if (!admin) {
      throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
    }
    admin.password = await bcrypt.hash(dto.password, 10);
    await this.repo.save(admin);
    return { message: 'Password updated successfully' };
  }

  async uploadCookie(dto: UploadCookieDto): Promise<any> {
    // Calcular expiresAt si alguna cookie tiene expires
    const expires = dto.cookies.reduce((acc: number | null, c: any) => {
      if (c.expires && Number(c.expires) > 0) {
        const ex = Number(c.expires);
        return acc ? Math.min(acc, ex) : ex;
      }
      return acc;
    }, null);

    const encrypted = encrypt(JSON.stringify(dto.cookies));
    const rec = this.cookieRepo.create({
      encrypted,
      savedAt: Date.now(),
      expiresAt: expires !== null ? expires : undefined,
      valid: true,
    });
    await this.cookieRepo.save(rec);

    return { ok: true, storedId: rec.id };
  }

  async getLatestCookie(): Promise<FacebookCookie | null> {
    return await this.cookieRepo
      .createQueryBuilder('cookie')
      .orderBy('cookie.savedAt', 'DESC')
      .getOne();
  }

  async markCookieAsInvalid(): Promise<void> {
    const record = await this.getLatestCookie();
    if (record) {
      record.valid = false;
      await this.cookieRepo.save(record);
    }
  }
}
