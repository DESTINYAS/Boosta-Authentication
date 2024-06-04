import { JwtModule } from "@nestjs/jwt";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from "@nestjs/passport";

import { LocalStrategy } from "./strategies/local.strategy";
import { AuthenticationService } from "./authentication.service";
import { AuthenticationController } from './authentication.controller';
import { JWTFromAuthHeaderStrategy } from './strategies/jwt.header.strategy';
import { UserModule } from "../users/users.module";
import QueuesClientNotifier from "../queues/notifier";
import { MessagingQueueConnectionProvider, OnboardingQueueConnectionProvider, StoreQueueConnectionProvider } from "../queues/queues.connection";


@Module({
    imports: [
        UserModule, PassportModule,
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET'),
                signOptions: {
                    expiresIn: `${configService.get('JWT_EXPIRATION_TIME')}s`,
                }
            })
        })
    ],
    providers: [AuthenticationService, LocalStrategy, JWTFromAuthHeaderStrategy, QueuesClientNotifier, OnboardingQueueConnectionProvider, StoreQueueConnectionProvider, MessagingQueueConnectionProvider],

    controllers: [AuthenticationController]
})
export class AuthenticationModule { }