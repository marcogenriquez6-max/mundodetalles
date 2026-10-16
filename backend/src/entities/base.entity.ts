import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  ManyToOne,
  Column,
} from 'typeorm';
import { Usuario } from './usuario.entity';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt?: Date | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'deleted_by' })
  deletedBy?: Usuario | null;

  @Column({ name: 'deleted_by', nullable: true })
  deletedById?: string | null;
}
