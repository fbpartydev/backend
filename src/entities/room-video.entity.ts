import { Entity, Column, ManyToOne } from 'typeorm';
import { CoreEntity } from './core.entity';
import { Room } from './room.entity';

@Entity('room_video')
export class RoomVideo extends CoreEntity {
  @Column({ type: 'text' })
  facebookUrl: string; // URL original de Facebook

  @Column({ type: 'text', nullable: true })
  videoUrl?: string; // URL del video extraída (mp4)

  @Column({ type: 'text', nullable: true })
  localPath?: string; // ruta local del video descargado

  @Column({ length: 50, default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'text', nullable: true })
  error?: string;

  @ManyToOne(() => Room, (room) => room.videos, { onDelete: 'CASCADE' })
  room: Room;

  @Column()
  roomId: number;
}

