import { Entity, Column, ManyToOne } from 'typeorm';
import { CoreEntity } from './core.entity';
import { Room } from './room.entity';

@Entity('room_video')
export class RoomVideo extends CoreEntity {
  @Column({ unique: true })
  code: string;

  @Column({ type: 'text' })
  facebookUrl: string;

  @Column({ type: 'text', nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  videoUrl?: string;

  @Column({ type: 'text', nullable: true })
  audioUrl?: string;

  @Column({ default: false })
  watched: boolean;

  @Column({ type: 'text', nullable: true })
  localVideoPath?: string;

  @Column({ type: 'text', nullable: true })
  localAudioPath?: string;

  @Column({ type: 'text', nullable: true })
  thumbnailPath?: string;

  @Column({ type: 'text', nullable: true })
  publicVideoUrl?: string;

  @Column({ type: 'text', nullable: true })
  publicAudioUrl?: string;

  @Column({ type: 'text', nullable: true })
  thumbnailUrl?: string;

  @Column({ length: 50, default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'text', nullable: true })
  error?: string | null;

  @ManyToOne(() => Room, (room) => room.videos, { onDelete: 'CASCADE' })
  room: Room;

  @Column()
  roomId: number;
}

