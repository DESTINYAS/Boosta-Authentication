import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import QueuesClientNotifier from '../queues/notifier'
import { MessagingQueueConnectionProvider, OnboardingQueueConnectionProvider, StoreQueueConnectionProvider } from '../queues/queues.connection'

import User from './entities/user.entity'
import { UsersService } from './users.service'
import { UsersController } from './users.controller';
import Profile from './entities/profile.entity'
import { ConfirmationCodeModule } from '../confiramtionCode/confirmationCode.module'
import { ConfirmationCodeService } from '../confiramtionCode/confirmationCodeService'
import ConfirmationCode from '../confiramtionCode/entities/confirmationCode.entity'


@Module({
    imports: [
        TypeOrmModule.forFeature([User, Profile, ConfirmationCode]),
        ConfigModule, ConfirmationCodeModule],
    controllers: [UsersController],
    providers: [UsersService, QueuesClientNotifier, OnboardingQueueConnectionProvider, MessagingQueueConnectionProvider, StoreQueueConnectionProvider, ConfirmationCodeService],
    exports: [UsersService] // allowing it to be used outside this module
})
export class UserModule { }