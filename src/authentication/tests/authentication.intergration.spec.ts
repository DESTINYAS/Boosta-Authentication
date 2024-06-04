import * as bcrypt from 'bcrypt';
import { Test } from '@nestjs/testing';

import { getRepositoryToken } from '@nestjs/typeorm';
import User from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { mockedConfigService } from '../../utils/mocks/config.service';
import { ConfigService } from '@nestjs/config';
import { AuthenticationService } from '../authentication.service';
import { mockedJwtService } from '../../utils/mocks/jwt.service';
import { JwtService } from '@nestjs/jwt';
import mockedUser, { mockedAdminUser, mockedAgentUser, mockProfile } from './user.mock';
import { MOCKED_USER_PASSWORD } from './user.mock';
import Profile from '../../users/entities/profile.entity';
import { MockOnboardingQueueConnectionProvider, MockQueuesClientProvider } from '../../utils/mocks/microservice.mock';
import { ConfirmationCodeService } from '../../confiramtionCode/confirmationCodeService';

// * We mock bcrypt here
jest.mock('bcrypt');

// * This tests integration with other services this module depends on

describe('AuthenticationService', () => {
    let authenticationService: AuthenticationService;
    let usersService: UsersService;
    let bcryptCompare: jest.Mock;
    let findUser: jest.Mock
    let createUser: jest.Mock
    let findProfile: jest.Mock
    let userData: User
    let profileData: Profile

    beforeEach(async () => {
        bcryptCompare = jest.fn().mockReturnValue(true);
        (bcrypt.compare as jest.Mock) = bcryptCompare;
        userData = {
            ...mockedUser
        }
        profileData = {
            ...mockProfile
        }
        findUser = jest.fn().mockReturnValue(userData)
        createUser = jest.fn()
        const userRepository = {
            findOne: findUser,
            create: createUser,
            save: jest.fn().mockReturnValue(Promise.resolve())
        }
        findProfile = jest.fn().mockReturnValue(profileData)

        findProfile = jest.fn().mockReturnValue(profileData)
        const profileRepository = {
            findOne: findProfile,
            create: jest.fn().mockReturnValue(mockProfile),
            save: jest.fn().mockReturnValue(Promise.resolve()),
        }
        const module = await Test.createTestingModule({
            providers: [
                UsersService,
                AuthenticationService,

                {
                    provide: ConfirmationCodeService,
                    useValue: {
                        createConfirmationCode: jest.fn(),
                        sendConfirmationCode: jest.fn()
                    },
                },
                {
                    provide: ConfigService,
                    useValue: mockedConfigService,
                },
                {
                    provide: JwtService,
                    useValue: mockedJwtService
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: userRepository,
                },
                {
                    provide: getRepositoryToken(Profile),
                    useValue: profileRepository,
                },
                MockOnboardingQueueConnectionProvider,
                MockQueuesClientProvider
            ],
        }).compile();
        authenticationService = await module.get<AuthenticationService>(AuthenticationService);
        usersService = await module.get(UsersService);
    })

    // * integration test, adding another service
    describe('when accessing the data of authenticating user', () => {
        it('should attempt to get the user by email', async () => {
            const getByPhoneNumberSpy = jest.spyOn(usersService, 'getByPhoneNumber');
            await authenticationService.getAuthenticatedUser(mockedUser.phoneNumber, MOCKED_USER_PASSWORD);
            expect(getByPhoneNumberSpy).toBeCalledTimes(1);
        })

        describe('and the provided password is not valid', () => {
            beforeEach(() => {
                bcryptCompare.mockReturnValue(false)
            })
            it('should throw an error', async () => {
                await expect(
                    authenticationService.getAuthenticatedUser(mockedUser.phoneNumber, MOCKED_USER_PASSWORD)
                ).rejects.toThrow();
            })
        })
        describe('and the provided password is valid', () => {
            beforeEach(() => {
                findUser.mockResolvedValue(userData)
            })
            it('should return the user data', async () => {
                const user = await authenticationService.getAuthenticatedUser(mockedUser.phoneNumber, MOCKED_USER_PASSWORD)
                expect(user).toBe(userData)
            })
        })

        describe('and user is not found in the database', () => {
            beforeEach(() => {
                findUser.mockResolvedValue(undefined)
            })
            it('should throw an error', async () => {
                await expect(authenticationService.getAuthenticatedUser(mockedUser.phoneNumber, MOCKED_USER_PASSWORD)).rejects.toThrow()
            })
        })

    })

    describe('when registering a user with an admin token', () => {
        describe('and the user role is an Admin', () => {
            beforeEach(() => {
                createUser.mockResolvedValue(mockedAdminUser)
                findUser.mockResolvedValue(mockedAdminUser)
            })

            it('if the admin token is correct, it should create the user', async () => {
                expect(await authenticationService.register({
                    ...mockedAdminUser, password: "password", ...mockedAdminUser.profile
                }, mockedAgentUser, "big-secret")).toBe(mockedAdminUser)
            })

            it('if the admin token is not correct, it should throw an error', async () => {
                await expect(authenticationService.register({
                    ...mockedAdminUser, password: "password", ...mockedAdminUser.profile
                }, mockedAgentUser, "big-secret-not-correct")).rejects.toThrow()
            })
        })
    })

    describe('when a user wants to reset their password', () => {
        it('should return a message saying it has sent confirmation code', async () => {
            const requestPasswordReset = jest.spyOn(usersService, 'requestPasswordReset');
            await authenticationService.requestPasswordReset("12345")
            expect(requestPasswordReset).toBeCalledTimes(1)
        })
    })
});