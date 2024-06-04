import { Test } from '@nestjs/testing';

import { getRepositoryToken } from '@nestjs/typeorm';
import User from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { mockedConfigService } from '../../utils/mocks/config.service';
import { ConfigService } from '@nestjs/config';
import { AuthenticationService } from '../authentication.service';
import { mockedJwtService } from '../../utils/mocks/jwt.service';
import { JwtService } from '@nestjs/jwt';
import Profile from '../../users/entities/profile.entity';
import { MockQueuesClientProvider, MockOnboardingQueueConnectionProvider, MockMessagingQueueConnectionProvider, MockStoreQueueConnectionProvider } from '../../utils/mocks/microservice.mock';
import { ConfirmationCodeService } from '../../confiramtionCode/confirmationCodeService';


// * This tests services inside this module alone.


describe('AuthenticationService', () => {
    let authenticationService: AuthenticationService;
    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                UsersService,
                AuthenticationService,
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
                    // mocked repository
                    useValue: {},
                },
                {
                    provide: getRepositoryToken(Profile),
                    useValue: {},
                },

                {
                    provide: ConfirmationCodeService,
                    useValue: {
                        createConfirmationCode: jest.fn(),
                        sendConfirmationCode: jest.fn()
                    },
                },
                MockQueuesClientProvider, MockOnboardingQueueConnectionProvider, MockMessagingQueueConnectionProvider, MockStoreQueueConnectionProvider
            ],
        }).compile();
        authenticationService = module.get<AuthenticationService>(AuthenticationService);
    })

    // * unit test -> services
    describe('when creating a bearer token', () => {
        it('should return a string', () => {
            const userId = "1";
            expect(
                typeof authenticationService.getBearerToken(userId)
            ).toEqual('string')
        })
    })

});