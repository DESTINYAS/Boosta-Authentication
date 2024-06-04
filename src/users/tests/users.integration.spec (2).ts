import * as bcrypt from 'bcrypt';
import { Test } from '@nestjs/testing';

import { getRepositoryToken } from '@nestjs/typeorm';
import User from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { mockedConfigService } from '../../utils/mocks/config.service';
import { ConfigService } from '@nestjs/config';
import { mockedJwtService } from '../../utils/mocks/jwt.service';
import { JwtService } from '@nestjs/jwt';
import Profile from '../../users/entities/profile.entity';
import QueuesClientNotifier from '../../queues/notifier';
import { MockOnboardingQueueConnectionProvider, MockQueuesClientProvider } from '../../utils/mocks/microservice.mock';
import mockedUser, { mockedAdminUser, mockProfile } from '../../authentication/tests/user.mock';
import { ConfirmationCodeService } from '../../confiramtionCode/confirmationCodeService';

// * We mock bcrypt here
jest.mock('bcrypt');

// * This tests integration with other services this module depends on

describe('UsersService', () => {
    let usersService: UsersService;
    let confirmationCodeService: ConfirmationCodeService;
    let queuesClientsNotifier: QueuesClientNotifier;
    let findUser: jest.Mock
    let findProfile: jest.Mock
    let userData: User
    let profileData: Profile

    beforeEach(async () => {
        userData = {
            ...mockedUser
        }

        findUser = jest.fn().mockReturnValue(userData)
        const userRepository = {
            findOne: findUser,
            create: jest.fn().mockReturnValue(mockedUser),
            save: jest.fn().mockReturnValue(Promise.resolve()),
            delete: jest.fn().mockReturnValue({
                affected: 1
            })
        }

        findProfile = jest.fn().mockReturnValue(profileData)
        const profileRepository = {
            findOne: findProfile,
            create: jest.fn().mockReturnValue(mockProfile),
            save: jest.fn().mockReturnValue(Promise.resolve()),
        }

        const module = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: ConfigService,
                    useValue: mockedConfigService,
                },
                {
                    provide: ConfirmationCodeService,
                    useValue: {
                        createConfirmationCode: jest.fn(),
                        sendPasswordResetCode: jest.fn(),
                        sendConfirmationCode: jest.fn()
                    },
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
        // authenticationService = await module.get<AuthenticationService>(AuthenticationService);
        usersService = await module.get(UsersService);
        confirmationCodeService = await module.get(ConfirmationCodeService);
        queuesClientsNotifier = await module.get(QueuesClientNotifier);
    })

    // * integration test, adding another service
    describe('when creating a new user', () => {
        it('should attempt to emit the new user details', async () => {
            const notifyAllServicesOfNewUser = jest.spyOn(queuesClientsNotifier, 'notifyAllServicesOfNewUser');
            const createConfirmationCode = jest.spyOn(confirmationCodeService, 'createConfirmationCode');
            const sendConfirmationCode = jest.spyOn(confirmationCodeService, 'sendConfirmationCode');
            await usersService.create({
                ...mockedUser, isPhoneVerified: true, homeAddress: ""
            }, "hash", mockedAdminUser)
            expect(notifyAllServicesOfNewUser).toBeCalledTimes(1);
            expect(createConfirmationCode).toBeCalledTimes(1);
            expect(sendConfirmationCode).toBeCalledTimes(1);
        })


    })
    describe('when deleting a user', () => {
        it('should attempt to emit the delete user command ', async () => {
            const notifyAllServicesOfDeletedUser = jest.spyOn(queuesClientsNotifier, 'notifyAllServicesOfDeletedUser');
            await usersService.deleteUser("1")
            expect(notifyAllServicesOfDeletedUser).toBeCalledTimes(1);
        })
    })

    describe('when logged out user wants to request password reset', () => {
        it('should create a confirmation code for that user', async () => {
            const createConfirmationCode = jest.spyOn(confirmationCodeService, 'createConfirmationCode');
            const sendConfirmationCode = jest.spyOn(confirmationCodeService, 'sendConfirmationCode');
            await usersService.requestPasswordReset("12345")
            expect(createConfirmationCode).toBeCalledTimes(1);
            expect(sendConfirmationCode).toBeCalledTimes(1);
        })
    })

});