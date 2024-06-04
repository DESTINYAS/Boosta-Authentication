import { APP_FILTER } from '@nestjs/core';
import * as Joi from '@hapi/joi';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthenticationModule } from './authentication/authentication.module';
import { CustomHttpExceptionFilter } from './utils/exceptionsLogger.filter';
import { UserModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';

@Module({
  // modules in the application
  // importing a module here instructs nestjs where to get 
  // the controllers and providers (services) for that module
  imports: [ConfigModule.forRoot({
    //ConfigModule reads from the .env file and Joi converts 
    // them to ts datatypes
    validationSchema: Joi.object({
      // POSTGRES_HOST: Joi.string().required(),
      // POSTGRES_PORT: Joi.number().required(),
      // POSTGRES_USER: Joi.string().required(),
      // POSTGRES_PASSWORD: Joi.string().required(),
      // POSTGRES_DB: Joi.string().required(),
      PORT: Joi.number(),
      JWT_SECRET: Joi.string().required(),
      JWT_EXPIRATION_TIME: Joi.string().required(),
      ADMIN_SIGN_UP_TOKEN: Joi.string().required(),
      PHONE_VERIFICATION_SECONDS_TO_EXPIRE: Joi.number().required(),
      NUMBER_OF_ROUNDS: Joi.number().required(),
    })
  }), DatabaseModule,
    AuthenticationModule,
    UserModule
  ],

  // controllers to instantiate
  controllers: [],

  // providers to instantiate - they may be used at least across this module
  providers: [
    // { provide: APP_FILTER, useClass: ExceptionsLoggerFilter },
    { provide: APP_FILTER, useClass: CustomHttpExceptionFilter }
  ],

  // a subset of providers that are available in other modules
  exports: []
})
export class AppModule { }
