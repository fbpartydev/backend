import { BeforeInsert, Column, Entity, OneToMany } from 'typeorm';
import { CoreEntity } from './core.entity';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { AdminRole } from 'src/modules/admin/enum/admin-role.enum';

@Entity({ name: 'admin' })
export class AdminEntity extends CoreEntity {
  @Column('varchar')
  name: string;

  @Column('varchar', { unique: true, nullable: false })
  email: string;

  @Column('text', { nullable: false })
  password: string;

  @Column({ nullable: true, enum: AdminRole })
  role: string;

  @Column('varchar', { nullable: true })
  identification: string;

  async comparePassword(attempt: string) {
    return await bcrypt.compare(attempt, this.password);
  }

  @BeforeInsert()
  async hashPass() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  get generateToken() {
    const { id, email, role } = this;
    return jwt.sign(
      {
        id,
        email,
        role,
      },
      process.env.SECRET_ADMIN,
    );
  }

  toResponseObject() {
    const {
      id,
      createdAt,
      updatedAt,
      version,
      email,
      generateToken,
      name,
      role,
      identification,
    } = this;
    const resp: any = {
      id,
      createdAt,
      updatedAt,
      version,
      email,
      name,
      role,
      identification,
    };
    resp.token = generateToken;
    return resp;
  }
} 