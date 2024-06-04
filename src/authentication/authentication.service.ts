
import * as bcrypt from 'bcrypt';
import { BadRequestException, HttpException, HttpStatus, Inject } from '@nestjs/common';


import RegisterDto from './dto/register.dto';
import User from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { PostgresErrorCode } from './../database/postgresErrorCodes.enum';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import TokenPayload from './tokenPayload.interface';
import BoostaRoles from '../roles/roles.enum';
import DuplicateResourceException from '../exceptions/duplicateResource.exception';

import { confirmationCodeSentToRegisteredUserMessage } from '../utils/http.errors';
import { hashPassword, verifyPassword } from '../utils';

export class AuthenticationService {
  constructor(
    // * Remember to inject service coming from another module
    @Inject(UsersService)
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  // Clear the token off the cookie
  public getCookieForLogout() {
    return `Authentication=; HttpOnly; Path=/; Max-Age=0`;
  }

  public getCookieWithJwtToken(userId: string) {
    const payload: TokenPayload = { userId };
    const token = this.jwtService.sign(payload);
    return `Authentication=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get(
      'JWT_EXPIRATION_TIME',
    )}`;
  }

  public getBearerToken(userId: string) {
    const payload: TokenPayload = { userId };
    return this.jwtService.sign(payload);
  }

  /**
   * Registers a new user across the platform.
   * @param registrationData The data of the new user to create.
   * @param requestor The user requesting this action to be performed.
   * @param adminSignUpToken This used to perform admin tasks from any client.
   * @returns the created user database records
   */
  public async register(
    registrationData: RegisterDto,
    requestor: User,
    adminSignUpToken: string = undefined,
  ): Promise<User> {
    if (
      !(
        registrationData.role === BoostaRoles.Merchant ||
        registrationData.role === BoostaRoles.Agent
      )
    ) {
      if (adminSignUpToken != this.configService.get('ADMIN_SIGN_UP_TOKEN'))
        throw new BadRequestException(
          'You can only register as a Merchant or an Agent',
        );
    }


    // * Make the user active if they are created with an admin sign up token
    let isPhoneVerified = false;
    if (adminSignUpToken != undefined) {
      isPhoneVerified = true
    }

    try {
      const createdUser = await this.usersService.create(
        {
          ...registrationData,
          isPhoneVerified: isPhoneVerified
        },
        await hashPassword(registrationData.password, this.configService.get("NUMBER_OF_ROUNDS")),
        requestor,
      );
      createdUser.hashedPassword = undefined;
      return createdUser;
    } catch (error) {
      if (
        error?.code == PostgresErrorCode.UniqueViolation ||
        error instanceof DuplicateResourceException
      ) {
        throw new DuplicateResourceException(
          'A user',
          registrationData.phoneNumber,
          'phone number',
        );
      }

      throw new HttpException(
        `Something went wrong. ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * A method that gets the user with the provided phone number and tries to verify the authenticity of the user's password
   * @param phoneNumber The phone number of the user to authenticate
   * @param plainTextPassword The plain password of the user to hash and compare with the stored hashed password
   * @returns The user if the there is a match in the hashes and phone number
   */
  public async getAuthenticatedUser(
    phoneNumber: string,
    plainTextPassword: string,
  ): Promise<User> {
    try {
      const user = await this.usersService.getByPhoneNumber(phoneNumber);
      await verifyPassword(plainTextPassword, user.hashedPassword);
      delete user.hashedPassword;
      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw new HttpException(
          'Wrong credentials provided',
          HttpStatus.FORBIDDEN,
        );
      }
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  /**
   * A method that handles the requests for a new password.
   * @param phoneNumber The phone number of the user requesting the action
   * @return
   */
  public async requestPasswordReset(phoneNumber: string): Promise<string> {
    try {
      return await this.usersService.requestPasswordReset(phoneNumber)
    } catch (error) {
      return confirmationCodeSentToRegisteredUserMessage
    }
  }

  /**
   * A method that handles the requests for a new password.
   * @param phoneNumber The phone number of the user requesting the action
   * @return
   */
  public async resendRequestPasswordConfirmationCode(phoneNumber: string): Promise<string> {
    try {
      await this.usersService.resendConfirmationCode(phoneNumber, phoneNumber)
    } catch (error) {
      // * For security reasons, do not let them know the number is not found in our database.
      // console.log(error)
    }
    return confirmationCodeSentToRegisteredUserMessage
  }


  /**
   * A method that updates the user's password with the code that was sent to the user
   * @param code The code that was sent to thei user's phone
   * @param password  The password the user wants to change to
   * @param passwordConfirmation A confirmation of the password they want to change to
   * @returns User
   */
  public async updatePasswordWithCode(code: string, password: string, passwordConfirmation: string) {
    return await this.usersService.updatePasswordWithCode(code, password, passwordConfirmation)
  }

}
