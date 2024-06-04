import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';

import { getRepositoryToken } from '@nestjs/typeorm';
import { mockedConfigService } from '../../utils/mocks/config.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

import User from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';

import BoostaRoles from '../../roles/roles.enum';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import mockedUser, {
  mockedAdminUser,
  mockedAgentUser,
  MOCKED_ADMIN_USER_PASSWORD,
  MOCKED_PASSWORD,
  MOCKED_USER_PASSWORD,
} from '../../authentication/tests/user.mock';
import { AuthenticationController } from '../../authentication/authentication.controller';
import { AuthenticationService } from '../../authentication/authentication.service';
import { JWTFromAuthHeaderStrategy } from '../../authentication/strategies/jwt.header.strategy';
import { LocalStrategy } from '../../authentication/strategies/local.strategy';
import QueuesClientNotifier from '../../queues/notifier';
import { UsersController } from '../users.controller';
import Gender from '../entities/gender.enum';
import Profile from '../entities/profile.entity';
import { SAMPLE_DB_ID } from '../../utils/mocks/ids.mock';
import { mockINestMicroservice, MockOnboardingQueueConnectionProvider, mockQueuesClient, MockQueuesClientProvider } from '../../utils/mocks/microservice.mock';
import { ConfirmationCodeService } from '../../confiramtionCode/confirmationCodeService';
import { mockConfirmationCodeData } from '../../confiramtionCode/tests/confirmationCode.service.spec';


// * This tests performs http tests across all the endpoints in the module

describe('UsersController', () => {
  let app: INestApplication
  let userData: User
  let findUsers: jest.Mock
  let findUser: jest.Mock
  let findOneBy: jest.Mock
  let findOne: jest.Mock
  let createUser: jest.Mock
  let createProfile: jest.Mock
  let findProfile: jest.Mock
  let updateProfile: jest.Mock
  let updateUser: jest.Mock
  let findOneConfirmation: jest.Mock
  let deleteUser: jest.Mock
  let mockGetConfirmationCode: jest.Mock
  let bcryptCompare: jest.Mock
  let mockGetConfirmationCodeByPhoneNumber: jest.Mock
  let mockRegenerateConfirmationCodeIfExpired: jest.Mock

  let newUserDetails = {
    "phoneNumber": "08000000000",
    "firstName": "Shola",
    "lastName": "Akpan",
    "middleName": "A",
    "gender": Gender.Male,
    "role": BoostaRoles.Admin
  }


  beforeEach(async () => {
    jest.mock('bcrypt');
    bcryptCompare = jest.fn().mockReturnValue(true);
    (bcrypt.compare as jest.Mock) = bcryptCompare;

    userData = {
      ...mockedUser
    }


    findUser = jest.fn().mockReturnValue(mockedAdminUser)
    updateUser = jest.fn();
    mockRegenerateConfirmationCodeIfExpired = jest.fn();
    findOneConfirmation = jest.fn();
    findOneBy = jest.fn().mockReturnValue(mockedAdminUser)
    findUsers = jest.fn().mockReturnValue([mockedAgentUser])
    deleteUser = jest.fn().mockReturnValue({
      affected: 1
    })
    createUser = jest.fn()
    const usersRepository = {
      create: createUser,
      findOne: findUser,
      find: findUsers,
      findOneBy: findOneBy,
      delete: deleteUser,
      update: updateUser,
      save: jest.fn().mockReturnValue(Promise.resolve())
    }

    findProfile = jest.fn().mockReturnValue(mockedAdminUser)
    updateProfile = jest.fn();
    mockGetConfirmationCode = jest.fn();
    mockGetConfirmationCodeByPhoneNumber = jest.fn();
    createProfile = jest.fn()
    const profileRepository = {
      create: createProfile,
      findOne: findProfile,
      update: updateProfile,
      save: jest.fn().mockReturnValue(Promise.resolve())
    }

    const module = await Test.createTestingModule({
      controllers: [AuthenticationController, UsersController],
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
            regenerateConfirmationCodeIfExpired: mockRegenerateConfirmationCodeIfExpired,
            createConfirmationCode: jest.fn(),
            sendConfirmationCode: jest.fn(),
            throwExceptionIfNotValid: jest.fn(),
            getConfirmationCodeByPhoneNumber: mockGetConfirmationCodeByPhoneNumber,
            getConfirmationCode: mockGetConfirmationCode,
            markUsed: jest.fn().mockReturnValue({
              affected: 1
            })
          },
        },
        {
          provide: ConfigService,
          useValue: mockedConfigService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: getRepositoryToken(Profile),
          useValue: profileRepository,
        },
        LocalStrategy, JWTFromAuthHeaderStrategy,
        MockOnboardingQueueConnectionProvider,
        MockQueuesClientProvider
      ]
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  let validAdminToken: string;
  let validNonAdminToken: string;

  describe('when singing in', () => {
    describe('and using valid data', () => {
      beforeEach(() => {
        findUser.mockResolvedValue(mockedAdminUser);
      });
      it('it should return the bearer token', () => {
        return request(app.getHttpServer())
          .post('/log-in')
          .send({
            phoneNumber: mockedUser.phoneNumber,
            password: MOCKED_ADMIN_USER_PASSWORD,
          })
          .expect(200)
          .expect((data) => {
            validAdminToken = data.body['access_token'];
          });
      });
    });
    describe('and using valid data', () => {
      beforeEach(() => {
        findUser.mockResolvedValue(mockedAgentUser);
      });
      it('it should return the bearer token', () => {
        return request(app.getHttpServer())
          .post('/log-in')
          .send({
            phoneNumber: mockedAgentUser.phoneNumber,
            password: MOCKED_PASSWORD,
          })
          .expect(200)
          .expect((data) => {
            validNonAdminToken = data.body['access_token'];
          });
      });
    });
  });

  describe('when creating a new user', () => {
    describe('if the phone number does not exist', () => {
      const expectedData = {
        ...userData,
      };

      beforeEach(() => {
        createUser.mockReturnValue(expectedData);
        findUser.mockReturnValue(mockedAdminUser);
        findOneBy.mockReturnValue(undefined);
      });
      it('it should create the user', () => {
        return request(app.getHttpServer())
          .post('/users')
          .set('Authorization', 'Bearer ' + validAdminToken)
          .send({
            ...newUserDetails,
            isPhoneVerified: true,
            homeAddress: 'their-address',
          })
          .expect(201);
      });
    });

    describe('and the creator is not an admin', () => {
      beforeEach(() => {
        findUser.mockReturnValue(mockedAgentUser);
      });
      it('it should throw a 403 error', async () => {
        return request(app.getHttpServer())
          .post('/users')
          .set('Authorization', 'Bearer ' + validNonAdminToken)
          .send({
            ...newUserDetails,
            isPhoneVerified: true,
            homeAddress: 'their-address',
          })
          .expect(403);
      });
    });
  });

  describe('when getting a single user', () => {
    describe('and the user exists', () => {
      beforeEach(() => {
        findUser.mockReturnValue(mockedAdminUser)
      })
      it('it should return the user', () => {
        return request(app.getHttpServer())
          .get('/users/' + SAMPLE_DB_ID)
          .set('Authorization', "Bearer " + validAdminToken)
          .expect(200)
      })
    })
  })

  describe('when deleting a user', () => {
    describe('and the user exists', () => {
      beforeEach(() => {
        findOneBy.mockReturnValueOnce(mockedAgentUser)
        deleteUser.mockReturnValue({
          affected: 1
        })
      })
      it('it should be successful', () => {
        return request(app.getHttpServer())
          .delete('/users/' + SAMPLE_DB_ID)
          .set('Authorization', "Bearer " + validAdminToken)
          .expect(200)
      })
    })
    describe('and the user does not exists', () => {
      beforeEach(() => {
        findOneBy.mockReturnValueOnce(undefined)
        deleteUser.mockReturnValue({
          affected: 0
        })
      })
      it('it should be successful', () => {
        return request(app.getHttpServer())
          .delete('/users/' + SAMPLE_DB_ID)
          .set('Authorization', "Bearer " + validAdminToken)
          .expect(404)
      })
    })
    describe('and the requestor is not an admin', () => {
      beforeEach(() => {
        findUser.mockReturnValue({
          ...mockedAgentUser, isActive: true
        })
      })
      it('it should throw a 403 error', () => {
        return request(app.getHttpServer())
          .delete('/users/' + SAMPLE_DB_ID)
          .set('Authorization', "Bearer " + validNonAdminToken)
          .expect(403)
      })
    })
    describe('and the user to be deleted is a super user', () => {
      beforeEach(() => {
        findOneBy.mockReturnValue(mockedAdminUser)
        findUser.mockReturnValue(mockedAdminUser)
      })
      it('it should throw a 403 error', () => {
        return request(app.getHttpServer())
          .delete('/users/' + SAMPLE_DB_ID)
          .set('Authorization', "Bearer " + validNonAdminToken)
          .expect(403)
      })
    })
  })

  describe('when a user wants to verify their phone number', () => {
    const updatedUser = {
      ...mockedAgentUser, profile: {
        ...mockedAgentUser.profile, isPhoneVerified: true
      }, isActive: true
    }
    describe('and the phone is valid', () => {
      beforeEach(() => {
        mockGetConfirmationCode.mockReturnValue(mockConfirmationCodeData)
        findUser.mockReturnValue(mockedAgentUser)
        findOneBy.mockReturnValue(updatedUser)
        findProfile.mockReturnValue(mockedAgentUser.profile)
        updateProfile.mockReturnValue({
          affected: 1
        })
        updateUser.mockReturnValue({
          affected: 1
        })
      })
      it('verify the user', () => {
        return request(app.getHttpServer())
          .post('/users/verify-phone')
          .send({
            "phoneNumber": "08099100752",
            "code": 123456
          })
          .expect(200)
      })
    })
    describe('and the code is not valid', () => {
      beforeEach(() => {
        mockGetConfirmationCode.mockReturnValue(undefined)
        findUser.mockReturnValue(mockedAgentUser)
        findOneBy.mockReturnValue(updatedUser)
      })
      it('return a 400 error', () => {
        return request(app.getHttpServer())
          .post('/users/verify-phone')
          .send({
            "phoneNumber": "08099100752",
            "code": 123456
          })
          .expect(400)
      })
    })
    describe('and the phone is not valid', () => {
      beforeEach(() => {
        mockGetConfirmationCode.mockReturnValue(mockConfirmationCodeData)
        findUser.mockReturnValue(undefined)
      })
      it('return a 400 error', () => {
        return request(app.getHttpServer())
          .post('/users/verify-phone')
          .send({
            "phoneNumber": "08099100752",
            "code": 123456
          })
          .expect(400)
      })
    })
  })

  describe('when a user wants to resend the confirmation code', () => {
    describe('and the code is no more valid', () => {
      const updatedUser = {
        ...mockedAgentUser,
        phoneNumber: "08099100752"
      }
      beforeEach(() => {
        mockGetConfirmationCodeByPhoneNumber.mockReturnValue({
          value: "123456"
        })
        mockRegenerateConfirmationCodeIfExpired.mockReturnValue(mockConfirmationCodeData)
      })
      it('should return an error', () => {
        return request(app.getHttpServer())
          .post('/users/resend-verify-phone-confirmation-code')
          .send({
            "newPhoneNumber": "08099100752",
            "originalPhoneNumber": "08099100752",
          })
          .expect(200)
      })
    })
  })


  describe('when an already logged in user wants to change their password', () => {
    describe('and the user exists, and all details are valid', () => {
      beforeEach(() => {
        findUser.mockReturnValueOnce(mockedAgentUser)
        bcryptCompare.mockReturnValue(true)
        updateUser.mockReturnValue({
          affected: 1
        })
      })
      it('it should be successful', () => {
        return request(app.getHttpServer())
          .put('/users/reset-password')
          .send({
            existingPassword: "theirpassword",
            newPassword: "theirpassword",
            newPasswordConfirmation: "theirpassword",
          })
          .set('Authorization', "Bearer " + validAdminToken)
          .expect(200)
      })
    })
    describe('and the user exists, and some of the details are not correct', () => {
      beforeEach(() => {
        findUser.mockReturnValueOnce(mockedAgentUser)
        bcryptCompare.mockReturnValue(false)
        updateUser.mockReturnValue({
          affected: 1
        })
      })
      it('it should be successful', () => {
        return request(app.getHttpServer())
          .put('/users/reset-password')
          .send({
            existingPassword: "theirpassword--",
            newPassword: "theirpassword",
            newPasswordConfirmation: "theirpassword",
          })
          .set('Authorization', "Bearer " + validAdminToken)
          .expect(403)
      })
    })
  })

});
