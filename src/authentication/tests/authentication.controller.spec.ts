import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';

import { getRepositoryToken } from '@nestjs/typeorm';
import { mockedConfigService } from '../../utils/mocks/config.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthenticationService } from '../authentication.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AuthenticationController } from '../authentication.controller';
import { JWTFromAuthHeaderStrategy } from '../strategies/jwt.header.strategy';
import { LocalStrategy } from '../strategies/local.strategy';

import User from '../../users/entities/user.entity';
import mockedUser, { MOCKED_USER_PASSWORD, mockProfile } from './user.mock';
import { UsersService } from '../../users/users.service';

import BoostaRoles from '../../roles/roles.enum';
import QueuesClientNotifier from '../../queues/notifier';
import Profile from '../../users/entities/profile.entity';
import { ConfirmationCodeService } from '../../confiramtionCode/confirmationCodeService';
import { confirmationCodeSentToRegisteredUserMessage } from '../../utils/http.errors';
import { mockConfirmationCodeData } from '../../confiramtionCode/tests/confirmationCode.service.spec';
import { mockedAgentUser } from './user.mock';


// * This tests performs http tests across all the endpoints in the module

describe('AuthenticationController', () => {
    let app: INestApplication
    let userData: User
    let createUser: jest.Mock
    let findUser: jest.Mock
    let findOneBy: jest.Mock
    let createProfile: jest.Mock
    let findProfile: jest.Mock
    let mockGetConfirmationCode: jest.Mock
    let updateUser: jest.Mock


    beforeEach(async () => {
        userData = {
            ...mockedUser
        }

        const mockINestMicroservice = {
            connect: jest.fn(),
            emit: jest.fn(),
            send: jest.fn()
        }

        const mockQueuesClient = {
            notifyAllServicesOfNewUser: jest.fn()
        }

        mockGetConfirmationCode = jest.fn();
        findUser = jest.fn().mockReturnValue(userData)
        findOneBy = jest.fn().mockReturnValue(userData)
        createUser = jest.fn().mockResolvedValue(userData)
        updateUser = jest.fn()
        const usersRepository = {
            create: createUser,
            update: updateUser,
            findOne: findUser,
            findOneBy: findOneBy,
            save: jest.fn().mockReturnValue(Promise.resolve())
        }


        findProfile = jest.fn().mockReturnValue(mockProfile)
        createProfile = jest.fn()
        const profileRepository = {
            create: createProfile,
            findOne: findProfile,
            save: jest.fn().mockReturnValue(Promise.resolve())
        }

        const module = await Test.createTestingModule({
            controllers: [AuthenticationController],
            imports: [
                JwtModule.registerAsync({
                    imports: [ConfigModule],
                    inject: [ConfigService],
                    useFactory: async (configService: ConfigService) => ({
                        // * using our own configService to read from our custom env
                        // mockedConfigService instead of configService
                        secret: mockedConfigService.get('JWT_SECRET'),
                        signOptions: {
                            expiresIn: `${mockedConfigService.get('JWT_EXPIRATION_TIME')}s`,
                        }
                    })
                })
            ],
            providers: [
                UsersService,
                AuthenticationService,
                {
                    provide: ConfirmationCodeService,
                    useValue: {
                        getConfirmationCodeByPhoneNumber: jest.fn().mockReturnValue({
                            value: "1234"
                        }),
                        regenerateConfirmationCodeIfExpired: jest.fn(),
                        createConfirmationCode: jest.fn(),
                        getConfirmationCode: mockGetConfirmationCode,
                        sendConfirmationCode: jest.fn(),
                        throwExceptionIfNotValid: jest.fn().mockResolvedValue(Promise.resolve()),
                        markUsed: jest.fn().mockResolvedValue(Promise.resolve())
                    },
                },
                {
                    provide: ConfigService,
                    useValue: mockedConfigService,
                },
                {
                    provide: getRepositoryToken(User),
                    // mocked repository
                    useValue: usersRepository,
                },
                {
                    provide: getRepositoryToken(Profile),
                    // mocked repository
                    useValue: profileRepository,
                },
                LocalStrategy, JWTFromAuthHeaderStrategy,
                {
                    provide: 'ONBOARDING_QUEUE_CONNECTION', useValue: mockINestMicroservice,
                },
                {
                    provide: QueuesClientNotifier, useValue: mockQueuesClient
                },
            ]
        },)
            .compile();
        app = module.createNestApplication()
        app.useGlobalPipes(new ValidationPipe())
        await app.init()
    })

    describe('when registering', () => {
        describe('and using valid data', () => {
            beforeEach(() => {
                findOneBy.mockReturnValue(undefined)
                createUser.mockReturnValue({
                    ...userData
                })

            })
            it('should respond with the data of the user without password', () => {

                return request(app.getHttpServer())
                    .post('/register')
                    .send({
                        phoneNumber: userData.phoneNumber,
                        lastName: userData.lastName,
                        firstName: userData.firstName,
                        middleName: userData.middleName,
                        gender: userData.gender,
                        password: MOCKED_USER_PASSWORD,
                        role: userData.role,
                        homeAddress: "homeAddress"
                    }).expect(201)
            })
        })

        describe('and the user being registered is a admin role', () => {
            beforeEach(() => {
                findOneBy.mockReturnValue(undefined)
                createUser.mockReturnValue({
                    ...userData
                })

            })
            it('should create the user if the sign up token is correct in the header', () => {

                return request(app.getHttpServer())
                    .post('/register')
                    .set('adminSignUpToken', "big-secret")
                    .send({
                        phoneNumber: userData.phoneNumber,
                        lastName: userData.lastName,
                        firstName: userData.firstName,
                        middleName: userData.middleName,
                        gender: userData.gender,
                        password: MOCKED_USER_PASSWORD,
                        role: "Admin",
                        homeAddress: "homeAddress"
                    }).expect(201)
            })
            it('should throw an error if the sign up token is bit correct in the header', () => {

                return request(app.getHttpServer())
                    .post('/register')
                    .set('adminSignUpToken', "big-secret-not-correct")
                    .send({
                        phoneNumber: userData.phoneNumber,
                        lastName: userData.lastName,
                        firstName: userData.firstName,
                        middleName: userData.middleName,
                        gender: userData.gender,
                        password: MOCKED_USER_PASSWORD,
                        role: "Admin",
                    }).expect(400)
            })
        })

        describe('and a user with that phone number exists', () => {
            beforeEach(() => {
                findUser.mockReturnValue(undefined)
                findOneBy.mockReturnValue(userData)
            })
            it('it should throw a 409 error', () => {
                return request(app.getHttpServer())
                    .post('/register')
                    .send({
                        phoneNumber: userData.phoneNumber,
                        lastName: userData.lastName,
                        firstName: userData.firstName,
                        middleName: userData.middleName,
                        gender: userData.gender,
                        password: MOCKED_USER_PASSWORD,
                        role: userData.role,
                        homeAddress: "homeAddress"
                    }).expect(409)
            })
        })
        describe('and using invalid data', () => {
            it('should throw an error', () => {
                return request(app.getHttpServer())
                    .post('/register')
                    .send({
                        firstName: mockedUser.firstName
                    }).expect(400)
            })
        })
        describe('and setting role other than Merchant or Agent', () => {
            it('should return an error', () => {
                return request(app.getHttpServer())
                    .post('/register')
                    .send({
                        phoneNumber: userData.phoneNumber,
                        lastName: userData.lastName,
                        firstName: userData.firstName,
                        middleName: userData.middleName,
                        gender: userData.gender,
                        password: MOCKED_USER_PASSWORD,
                        role: BoostaRoles.Admin,
                    }).expect(400)
            })
        })
    })


    describe('when singing in', () => {
        let validToken = "";
        describe('and using valid data', () => {
            it('it should return the bearer token', () => {
                return request(app.getHttpServer())
                    .post('/log-in')
                    .send({
                        phoneNumber: mockedUser.phoneNumber,
                        password: MOCKED_USER_PASSWORD
                    }).expect(200).expect((data) => {
                        validToken = data.body['access_token']
                    })
            })
        })

        describe('and using valid data', () => {
            it('logged in user should be able to make authenticated request', () => {
                return request(app.getHttpServer())
                    .get('/me')
                    .set('Authorization', "Bearer " + validToken)
                    .expect(200)
            })
        })


        describe('and using in valid data', () => {
            it('it should should fail', () => {
                return request(app.getHttpServer())
                    .post('/log-in')
                    .send({
                        phoneNumber: mockedUser.phoneNumber,
                        password: 'invalid-password'
                    }).expect(403).expect((data) => {
                        data.body['access_token']
                    })
            })
        })
    })

    describe('when a user request password change', () => {
        describe('and the user account does not exist', () => {
            beforeEach(() => {
                findUser.mockReturnValue(undefined)
            })
            it('should return a 200 status code even when they account does not exist for security reasons', () => {
                return request(app.getHttpServer())
                    .post('/request-password-change')
                    .send({
                        phoneNumber: userData.phoneNumber,
                    }).expect(200).expect({
                        message: confirmationCodeSentToRegisteredUserMessage
                    })
            })
        })

        describe('and the user account exist', () => {
            beforeEach(() => {
                findUser.mockReturnValue(userData)
            })
            it('should return a 200 status code', () => {
                return request(app.getHttpServer())
                    .post('/request-password-change')
                    .send({
                        phoneNumber: userData.phoneNumber,
                    }).expect(200).expect({
                        message: confirmationCodeSentToRegisteredUserMessage
                    })
            })
        })
    })

    describe('when requesting a password resend', () => {
        describe('and the user account does not exist', () => {
            beforeEach(() => {
                findUser.mockReturnValue(undefined)
            })
            it('should return a 200 status code even when they account does not exist for security reasons', () => {
                return request(app.getHttpServer())
                    .post('/resend-reset-password-confirmation-code')
                    .send({
                        phoneNumber: userData.phoneNumber,
                    }).expect(200)
            })
        })

        describe('and the user account exist', () => {
            beforeEach(() => {
                findUser.mockReturnValue(userData)
            })
            it('should return a 200 status code', () => {
                return request(app.getHttpServer())
                    .post('/resend-reset-password-confirmation-code')
                    .send({
                        phoneNumber: userData.phoneNumber,
                    }).expect(200)
            })
        })
    })

    describe('when a user wants to change the password with confirmation code', () => {
        describe('and the code exists', () => {
            beforeEach(() => {
                findUser.mockReturnValue(mockedAgentUser)
                mockGetConfirmationCode.mockReturnValue(mockConfirmationCodeData)
                updateUser.mockReturnValue({
                    affected: 1
                })
            })
            it('it should update the password ', () => {
                return request(app.getHttpServer())
                    .put('/reset-password-with-code')
                    .send({
                        code: 123456,
                        password: "password",
                        passwordConfirmation: "password",
                    }).expect(200)

            })
        })
    })

});