import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Injectable, BadRequestException } from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import User from './entities/user.entity'
import CreateUserDto from './dto/createUser.dto'
import DuplicateResourceException from '../exceptions/duplicateResource.exception'
import BoostaNotFoundException from '../exceptions/notFoundExceptions';
import Profile from './entities/profile.entity';
import BoostaForbiddenException from '../exceptions/forbidden.exception';
import QueuesClientNotifier from '../queues/notifier';
import { ConfirmationCodeService, invalidConfirmationCodeException } from '../confiramtionCode/confirmationCodeService';
import ConfirmationCodeTypes from '../confiramtionCode/entities/confirmationCodeTypes';
import { confirmationCodeSentToRegisteredUserMessage } from '../utils/http.errors';
import { hashPassword, verifyPassword } from '../utils';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private readonly queueClients: QueuesClientNotifier,
    private readonly confirmationCodeService: ConfirmationCodeService,
    private readonly configService: ConfigService,
  ) { }


  async verifyPhoneFromCode(phoneNumber: string, code: string) {
    await this.confirmationCodeService.throwExceptionIfNotValid(code)
    const confirmationCodeData = await this.confirmationCodeService.getConfirmationCode(code)
    if (confirmationCodeData) {
      this.confirmationCodeService.markUsed(confirmationCodeData.id)
      try {
        return await this.markPhoneNumberVerified(phoneNumber)
      } catch (error) { }
    }

    throw invalidConfirmationCodeException
  }

  async resendConfirmationCode(originalPhoneNumber: string, newPhoneNumber: string, confirmationType: ConfirmationCodeTypes = ConfirmationCodeTypes.PHONE_NUMBER): Promise<void> {
    const userSaved = await this.getByPhoneNumber(originalPhoneNumber)
    const oldConfirmationCode = await this.confirmationCodeService.getConfirmationCodeByPhoneNumber(originalPhoneNumber, confirmationType)

    if (newPhoneNumber != userSaved.phoneNumber)
      await this.updatePhoneNumber(userSaved.id, newPhoneNumber)

    const newConfirmationCode = await this.confirmationCodeService.regenerateConfirmationCodeIfExpired({
      ...userSaved, phoneNumber: newPhoneNumber
    }, oldConfirmationCode.value)

    this.confirmationCodeService.sendConfirmationCode(newConfirmationCode)
  }
  /**
   * A method that sets the user active
   * @param user The user to set active
   */
  private async setUserActive(user: User) {
    user.isActive = true
    const userUpdateResponse = await this.usersRepository.update(user.id, user)
    if (!userUpdateResponse.affected) throw new BadRequestException("The server is unable to activate your account.")
  }

  /**
   * A method that marks the phone number of the user verified.
   * @param phoneNumber The phone number of the user to verify
   * @returns User
   */
  async markPhoneNumberVerified(phoneNumber: string) {
    const user = await this.getByPhoneNumber(phoneNumber)
    if (user) {
      await this.setUserActive(user)
      const profile = await this.profileRepository.findOne({ where: { id: user.profile.id } })
      if (profile) {
        profile.isPhoneVerified = true
        const profileUpdateResponse = await this.profileRepository.update(profile.id, profile)
        if (!profileUpdateResponse.affected) throw new BadRequestException("The server is unable to verify your phone number")
      }
      // TODO: needs test
      this.queueClients.notifyAllServicesOfPhoneVerified(user)
      return await this.usersRepository.findOneBy({ id: user.id })
    }

    throw new BoostaNotFoundException("User", phoneNumber, "Phone Number")
  }

  /**
   * A method that updates the phone number of the given user
   * @param userID The user ID to update
   * @param newPhoneNumber The new number to edit to
   * @returns User
   */
  async updatePhoneNumber(userID: string, newPhoneNumber: string) {
    const user = await this.getById(userID)
    await this.usersRepository.update(userID, {
      ...user, phoneNumber: newPhoneNumber
    })
    return await this.getById(userID)
  }

  /**
   * A method that updates the phone number of the given user
   * @param userID The user ID to update
   * @returns User
   */
  async markPhoneVerified(userID: string) {
    const user = await this.getById(userID)
    const profile = await this.profileRepository.findOne({ where: { user: user } })
    if (profile) {
      this.profileRepository.update(profile.id, { isPhoneVerified: true })
      return
    }

    throw new BadRequestException("The server is unable to update the user's profile")
  }

  /**
   * A method that updates the phone number of the given user
   * @param userID The user ID to update
   * @returns User
   */
  async markUserOnBoarded(userID: string) {
    const user = await this.getById(userID)
    const profile = await this.profileRepository.findOne({ where: { user: user } })
    if (profile) {
      this.profileRepository.update(profile.id, { isOnboarded: true })
      return
    }

    throw new BadRequestException("The server is unable to update the user's profile")
  }

  /**
   * A method that gets the user with the specified phone number. A 404 exception is thrown
   * if the user does not exist.
   * @param phoneNumber The phone number of the user to retrieve the record for
   * @returns The user that corresponds to the given phone number.
   */
  async getByPhoneNumber(phoneNumber: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { phoneNumber: phoneNumber } })
    if (user) return user;

    throw new BoostaNotFoundException('User', phoneNumber, "phone number")
  }

  /**
   * A method that creates a new user across the services. The function emits the new data
   * across all supported services of the product.
   * @param userData The data of the user to create.
   * @param hashedPassword The hash version of the plain password.
   * @param requestor The user requesting for user creation.
   * @returns The created user database record and the their profile.
   */
  async create(userData: CreateUserDto, hashedPassword: string, requestor: User): Promise<User> {
    let existingUser: User;
    try {
      existingUser = await this.usersRepository.findOneBy({ phoneNumber: userData.phoneNumber })
    } catch (error) { }
    if (existingUser) {
      throw new DuplicateResourceException("User", userData.phoneNumber, "phone number")
    }

    const newUser = await this.usersRepository.create({
      ...userData, hashedPassword: hashedPassword, createdBy: requestor, isActive: userData.isPhoneVerified
    })
    await this.usersRepository.save(newUser)

    await this.createUserProfile(newUser, userData.isPhoneVerified, userData.homeAddress)

    const newUserWithProfile = await this.getById(newUser.id)

    this.queueClients.notifyAllServicesOfNewUser(newUserWithProfile)
    const confirmationCode = await this.confirmationCodeService.createConfirmationCode(newUser, ConfirmationCodeTypes.PHONE_NUMBER)
    await this.confirmationCodeService.sendConfirmationCode(confirmationCode)

    return newUserWithProfile
  }
  /**
   * A method that creates a profile for the given user.
   * @param user The database record of the user to create the profile for.
   * @param isPhoneVerified Determines if the user's phone number has been manually or automatically verified
   * @param homeAddress The address of the user being created
   * @returns The profile database record that was created.
   */
  private async createUserProfile(
    user: User,
    isPhoneVerified: boolean,
    homeAddress: string,
  ) {
    this.profileRepository.findOne({ where: { user: user } });
    const userProfile = await this.profileRepository.create({
      isPhoneVerified: isPhoneVerified,
      homeAddress: homeAddress,
      user: user,
    });
    return await this.profileRepository.save(userProfile);
  }

  /**
   * A method that retrieves the user that corresponds to the given ID
   * @param id The ID of the user to retrieve from the database
   * @returns The database record of the user that was created.
   */
  async getById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (user) {
      return user;
    }
    throw new BoostaNotFoundException('User', id, 'ID');
  }

  /**
   * A method that retrieves the user's hash password that corresponds to the given ID
   * @param id The ID of the user to retrieve from the database
   * @returns The database record of the user that was created.
   */
  async getUserPasswordHash(id: string): Promise<any> {
    const user = (await this.usersRepository.findOne({ select: ["hashedPassword"], where: { id } }));
    if (user) {
      return user;
    }
    throw new BoostaNotFoundException('User', id, 'ID');
  }

  /**
   * A method that retrieves a paginated result of all the users that exists in the system.
   * @param skip
   * @param limit
   * @returns
   */
  async getAllUsers(skip = 0, limit = 10) {
    return await this.usersRepository.find({ skip: skip, take: limit });
  }

  /**
   * A method that tries to delete the user that corresponds to the given ID.
   * If no user is found, a 404 exception will be thrown. A super user can not be
   * deleted.
   * @param id The ID of the user to delete.
   */
  async deleteUser(id: string) {
    let existingUser: User;
    try {
      existingUser = await this.usersRepository.findOneBy({ id: id });
    } catch (error) {
      if (error instanceof BoostaNotFoundException) throw error;
    }

    if (existingUser && existingUser.isSuperUser) {
      throw new BoostaForbiddenException();
    }

    const deleteResponse = await this.usersRepository.delete({ id: id });
    if (!deleteResponse.affected) {
      throw new BoostaNotFoundException('User', id, 'ID');
    }

    this.queueClients.notifyAllServicesOfDeletedUser(existingUser);
  }

  /**
   * A method that re-sends a new code to the user for confirmation to change their password.
   * @param phoneNumber The phone number to resend the code to, this must be the registered user's phone number
   * @returns Message that always says the code has been sent.
   */
  async requestPasswordReset(phoneNumber: string): Promise<string> {
    const user = await this.getByPhoneNumber(phoneNumber)
    const confirmationCode = await this.confirmationCodeService.createConfirmationCode(user, ConfirmationCodeTypes.PASSWORD_RESET)
    await this.confirmationCodeService.sendConfirmationCode(confirmationCode)
    return confirmationCodeSentToRegisteredUserMessage
  }

  /**
   * A method that updates the user's password, the user needs to provide the
   * existing password and their chosen password.
   * @param userID The ID of the user to retrieve from the database
   * @param existingPassword The plain existing password
   * @param password The new plain password
   * @param confirmPassword A confirmation of the new plain password
   * @returns User: the database record of the user that was created.
   */
  async updateUserPasswordLocked(userID: string, existingPassword: string, password: string, confirmPassword: string): Promise<User> {
    if (password.toLowerCase() != confirmPassword.toLowerCase()) throw new BadRequestException("The chosen password and the confirmation password must match")

    const userWithHashOnly = await this.getById(userID)

    try {
      await verifyPassword(existingPassword, userWithHashOnly.hashedPassword)
    } catch (error) {
      console.log(error)
      throw new BoostaForbiddenException("Your existing password does not match the one we have in our records.")
    }

    const newPasswordHash = await hashPassword(password, this.configService.get("NUMBER_OF_ROUNDS"))

    const response = await this.usersRepository.update(userID, {
      hashedPassword: newPasswordHash,
    });
    if (!response.affected) {
      throw new BoostaNotFoundException('User', userID, 'ID');
    }
    return await this.getById(userID);
  }

  async updatePasswordWithCode(code: string, password: string, passwordConfirmation: string) {
    const confirmationCode = await this.confirmationCodeService.getConfirmationCode(code)
    if (password.toLowerCase() != passwordConfirmation.toLowerCase()) throw new BadRequestException("The chosen password and the confirmation password must match")

    const user = await this.getByPhoneNumber(confirmationCode.phoneNumber)

    await this.confirmationCodeService.throwExceptionIfNotValid(code)
    await this.confirmationCodeService.markUsed(confirmationCode.id)

    const newPasswordHash = await hashPassword(password, this.configService.get("NUMBER_OF_ROUNDS"))
    const response = await this.usersRepository.update(user.id, {
      hashedPassword: newPasswordHash,
    });
    if (!response.affected) {
      throw new BoostaNotFoundException('User', user.id, 'ID');
    }
    return user
  }

}
