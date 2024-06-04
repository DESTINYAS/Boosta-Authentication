import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm'
import User from './user.entity';

@Entity()
class Profile {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column({ default: "" })
    public homeAddress: string

    @Column({
        default: false
    })
    public isOnboarded: boolean

    @Column({
        default: false
    })
    public isPhoneVerified: boolean

    // setting up bi-direction between the two entities
    // fetch addresses with users
    // .find({ relations: ['user]})
    // When setting up bi-directional entities do not use JoinTable here since it has been used in User table
    @OneToOne(() => User, (user: User) => user.profile)
    public user?: User;
}

export default Profile