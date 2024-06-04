/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import QueuesClientNotifier from '../queues/notifier';
import { MessagingQueueConnectionProvider, OnboardingQueueConnectionProvider, StoreQueueConnectionProvider } from '../queues/queues.connection';
import { UsersService } from '../users/users.service';

import { ConfirmationCodeService } from './confirmationCodeService';
import ConfirmationCode from './entities/confirmationCode.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([ConfirmationCode]),
        ConfigModule],
    controllers: [],

    providers: [QueuesClientNotifier,
        ConfirmationCodeService,
        MessagingQueueConnectionProvider,
        StoreQueueConnectionProvider,
        OnboardingQueueConnectionProvider],

    exports: [ConfirmationCodeService],
})
export class ConfirmationCodeModule { }
