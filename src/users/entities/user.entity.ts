import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Exclude } from 'class-transformer';
import BoostaRoles from '../../roles/roles.enum';
import Gender from './gender.enum';
import Profile from './profile.entity';

@Entity()
class User {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column({
        unique: true
    })
    public phoneNumber: string


    @Column()
    public firstName: string

    @Column()
    public lastName: string

    @Column()
    public middleName: string

    @Column({
        type: 'enum',
        enum: Gender,
    })
    public gender: Gender

    @Column()
    @Exclude()
    public hashedPassword: string;

    @Column({unique:true, nullable: true })
    @Exclude()
    public token: string;

    @Column({ nullable: true })
    @Exclude()
    public hashedPurchasePin: string;

    @Column({ unique:true,nullable: true })
    public email: string;


    @Column({
        default: false
    })
    public isActive: boolean

    @Column({
        default: false
    })
    public isSuperUser: boolean

    @OneToOne(() => Profile, {
        eager: true, // we want the related entities to always be included,

        // setting cascade allows us to pass the address along with the user data during POST
        // and the address table will be populated with the passed address data and the user table will be updated with the 
        // address id
        cascade: false
    })
    @JoinColumn()
    public profile: Profile

    @Column({
        type: 'enum',
        enum: BoostaRoles,
        default: BoostaRoles.Merchant
    })
    public role: BoostaRoles

    @ManyToOne(type => User)
    public createdBy: User;

    @CreateDateColumn({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP(6)" })
    public createdAt: Date;

    @UpdateDateColumn({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
    public updatedAt: Date;
}

export default User;