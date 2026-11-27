import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { User } from './user.entity';

export enum UserTokenType {
  INVITE = 'INVITE', // Mời đặt mật khẩu lần đầu
  RESET = 'RESET', // Quên mật khẩu
}

/** Token một lần dùng cho link trong email. Chỉ lưu SHA-256 của token, không lưu bản gốc */
@Entity('user_tokens')
export class UserToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: Relation<User>;

  @Column({ type: 'enum', enum: UserTokenType })
  type!: UserTokenType;

  @Index({ unique: true })
  @Column({ length: 64 })
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
