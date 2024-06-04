import ConfirmationCodeTypes from './confirmationCodeTypes';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
class ConfirmationCode {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column({
        unique: false
    })
    public phoneNumber: string

    @Column()
    public value: string

    @Column()
    public secondsToExpire: number

    @Column({
        type: 'enum',
        enum: ConfirmationCodeTypes,
    })
    public confirmationCodeType: ConfirmationCodeTypes

    @CreateDateColumn({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP(6)" })
    public createdAt: Date;

    @UpdateDateColumn({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
    public updatedAt: Date;

    @UpdateDateColumn({ type: "timestamptz", nullable: true })
    public dateSent: Date;

    @Column({ default: false })
    public messageSent: boolean

    @Column({ nullable: true })
    public messagingID: string


}

export default ConfirmationCode