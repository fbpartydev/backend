import { Entity, Column, OneToMany } from 'typeorm';
import { CoreEntity } from './core.entity';
import { RoomVideo } from './room-video.entity';

@Entity('room')
export class Room extends CoreEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 100, unique: true })
  code: string; // código único para compartir la sala

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => RoomVideo, (roomVideo) => roomVideo.room)
  videos: RoomVideo[];
}

