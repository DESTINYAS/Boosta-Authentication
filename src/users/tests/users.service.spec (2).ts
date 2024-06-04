import * as bcrypt from 'bcrypt';

import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { mockedAdminUser, mockProfile, mockedAgentUser } from '../../authentication/tests/user.mock';
import { ConfirmationCodeService } from '../../confiramtionCode/confirmationCodeService';
import BoostaNotFoundException from '../../exceptions/notFoundExceptions'
import User from "../../users/entities/user.entity"
import { mockedConfigService } from '../../utils/mocks/config.service';
import { MockQueuesClientProvider, MockOnboardingQueueConnectionProvider, MockMessagingQueueConnectionProvider, MockStoreQueueConnectionProvider } from '../../utils/mocks/microservice.mock';
import Profile from '../entities/profile.entity'
import { UsersService } from '../users.service'


jest.mock('bcrypt');

describe('The UsersService', () => {
  let usersService: UsersService;
  let findOne: jest.Mock;
  let createUser: jest.Mock;
  let findUserOneBy: jest.Mock;
  let findUsers: jest.Mock;
  let createProfile: jest.Mock;
  let findProfile: jest.Mock;
  let saveUser: jest.Mock;
  let updateUser: jest.Mock;
  let updateProfile: jest.Mock;
  let deleteUser: jest.Mock;
  let bcryptCompare: jest.Mock;

  beforeEach(async () => {
    bcryptCompare = jest.fn().mockReturnValue(true);
    (bcrypt.compare as jest.Mock) = bcryptCompare;

    findOne = jest.fn();
    findUserOneBy = jest.fn();
    findUsers = jest.fn();
    createUser = jest.fn();
    saveUser = jest.fn();
    deleteUser = jest.fn();
    updateUser = jest.fn();

    findProfile = jest.fn();
    createProfile = jest.fn();
    updateProfile = jest.fn();



    const module = await Test.createTestingModule({
      providers: [UsersService,
        {
          provide: ConfigService,
          useValue: mockedConfigService,
        },
        {
          provide: ConfirmationCodeService,
          useValue: {
            createConfirmationCode: jest.fn(),
            sendConfirmationCode: jest.fn()
          },
        },
        {
          provide: getRepositoryToken(User), useValue: {
            findOne, create: createUser, save: saveUser, findOneBy: findUserOneBy, find: findUsers, delete: deleteUser, update: updateUser
          }
        },
        { provide: getRepositoryToken(Profile), useValue: { update: updateProfile, findOne: findProfile, create: createProfile, save: jest.fn().mockResolvedValue(Promise.resolve()) } },
        MockQueuesClientProvider,
        MockOnboardingQueueConnectionProvider, MockMessagingQueueConnectionProvider, MockStoreQueueConnectionProvider
      ]
    }).compile()
    usersService = await module.get(UsersService)
  })


  describe('when getting a user by email', () => {
    // * unit test
    describe('and the user is matched', () => {
      let user: User;
      beforeEach(() => {
        user = new User();
        findOne.mockReturnValue(Promise.resolve(user))
      })

      it('should return the user', async () => {
        const fetchedUser = await usersService.getByPhoneNumber('test@test.com')
        expect(fetchedUser).toEqual(user)
      })
    })

    // * unit test
    describe('and the user is not matched', () => {
      beforeEach(() => {
        findOne.mockReturnValue(undefined)
      })
      it('should throw an error', async () => {
        await expect(usersService.getByPhoneNumber('test@test.com')).rejects.toThrow()
      })
    })


  })

  describe('when creating a user', () => {
    describe('and the creator is an admin', () => {
      beforeEach(() => {
        createUser.mockReturnValue(mockedAdminUser)
        createProfile.mockReturnValue(mockProfile)
        findUserOneBy.mockReturnValue(undefined)
        findOne.mockReturnValue(mockedAdminUser)
        findProfile.mockReturnValue(undefined)
      })
      it('is should create the user and return the created user', async () => {
        const createdUser = await usersService.create({ ...mockedAdminUser, isPhoneVerified: true, homeAddress: "their-address" }, "hash", mockedAdminUser)
        expect(createdUser).toBe(mockedAdminUser)
      })
    })

    describe('and a user with the phone number already exist', () => {
      beforeEach(() => {
        findOne.mockReturnValue(mockedAdminUser)
        findUserOneBy.mockReturnValue(mockedAdminUser)
      })
      it('should throw an error', async () => {
        await expect(usersService.create({ ...mockedAdminUser, isPhoneVerified: true, homeAddress: 'their-address' }, "hash", mockedAdminUser)).rejects.toThrow()
      })
    })

  })


  describe('when getting a user', () => {
    describe('and the user exists', () => {
      const expectedData = mockedAdminUser
      delete expectedData.hashedPassword
      beforeEach(() => {
        findOne.mockReturnValue(expectedData)
      })
      it('should return the user with the id', async () => {
        const returnedData = await usersService.getById("1")
        expect(returnedData).toBe(expectedData)
      })
    })

    describe('and the user does not exist', () => {
      beforeEach(() => {
        findOne.mockReturnValue(undefined)
      })
      it('should throw an error', () => {
        expect(usersService.getById("1")).rejects.toThrow(new BoostaNotFoundException("User", "1", "ID"))
      })
    })
  })

  describe('when getting all users', () => {
    beforeEach(() => {
      findUsers.mockReturnValue([mockedAgentUser])
    })
    it('should return all users', async () => {
      const users = await usersService.getAllUsers()
      expect(users).toStrictEqual([mockedAgentUser])
    })
  })


  describe('when deleting a user', () => {
    describe('and the user exists', () => {
      beforeEach(() => {
        deleteUser.mockReturnValue({
          affected: 1
        })
      })
      it('the delete method should be called', async () => {
        const deleteResposne = await usersService.deleteUser("1")
        expect(deleteResposne).toBe(undefined)
      })
    })

    describe('and the user does not exist', () => {
      beforeEach(() => {
        deleteUser.mockReturnValue({
          affected: 0
        })
      })
      it('should throw an error', async () => {
        await expect(usersService.deleteUser("1")).rejects.toThrow(new BoostaNotFoundException("User", "1", "ID"))
      })
    })
  })

  describe('when a user to change their phone number', () => {
    describe('and the user exist', () => {
      beforeEach(() => {
        findOne.mockReturnValue(mockedAgentUser)
        updateUser.mockReturnValue({
          affected: 1
        })
      })
      it('should change the phone number', async () => {
        expect(await usersService.updatePhoneNumber("1234", "08129292")).toBe(mockedAgentUser)
      })
    })
  })

  describe('when verifying a user phone number', () => {
    const updatedUser = {
      ...mockedAgentUser, profile: {
        ...mockedAgentUser.profile, isPhoneVerified: true
      }, isActive: true
    }
    describe('and the phone number exists', () => {
      beforeEach(() => {
        findOne.mockReturnValue(mockedAgentUser)
        findUserOneBy.mockReturnValue(updatedUser)
        findProfile.mockReturnValue(mockedAgentUser.profile)
        updateProfile.mockReturnValue({
          affected: 1
        })
        updateUser.mockReturnValue({
          affected: 1
        })

      })
      it('should mark the user active and phone verified', async () => {
        expect(await usersService.markPhoneNumberVerified("123456")).toBe(updatedUser)
      })
    })
    describe('and the phone number does not exists', () => {
      beforeEach(() => {
        findOne.mockReturnValue(undefined)
      })
      it('it should throw an error', async () => {
        await expect(usersService.markPhoneNumberVerified("123456")).rejects.toThrow()
      })
    })
  })


  describe('when a user wants to update their password locked', () => {

    describe('and the user supply a correct existing password', () => {
      beforeEach(() => {
        findOne.mockReturnValue(mockedAgentUser)
        bcryptCompare.mockReturnValue(true)
        updateUser.mockReturnValue({
          affected: 1
        })
      })
      it('should update the user password', async () => {
        expect(await usersService.updateUserPasswordLocked("1234", "existingPassword", "newPass", "newPass")).toBe(mockedAgentUser)
      })
    })

    describe('and the user supply a wrong existing password', () => {
      beforeEach(() => {
        findOne.mockReturnValue(mockedAgentUser)
        bcryptCompare.mockReturnValue(false)
      })
      it('should update the user password', async () => {
        await expect(usersService.updateUserPasswordLocked("1234", "existingPassword", "newPass", "newPass")).rejects.toThrow()
      })
    })

    describe('and the user supply two different password for confirmation and password', () => {
      beforeEach(() => {
        findOne.mockReturnValue(mockedAgentUser)
        bcryptCompare.mockReturnValue(true)
      })
      it('should update the user password', async () => {
        await expect(usersService.updateUserPasswordLocked("1234", "existingPassword", "newPass1", "newPass")).rejects.toThrow()
      })
    })

  })

})
