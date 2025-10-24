import { Entity, Column } from 'typeorm';
import { CoreEntity } from './core.entity';

@Entity('facebook_cookie')
export class FacebookCookie extends CoreEntity {
  @Column('text')
  encrypted: string; // encrypted JSON

  @Column({ type: 'bigint', nullable: true })
  expiresAt?: number; // unix seconds

  @Column({ type: 'bigint' })
  savedAt: number;

  @Column({ type: 'bigint', nullable: true })
  lastValidCheck?: number;

  @Column({ default: true })
  valid: boolean;
}

