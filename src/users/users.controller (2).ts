


import {
    Body,
    Req,
    Controller,
    HttpCode,
    Post,
    UseGuards,
    Get,
    Param,
    Query,
    Delete,
    Put,
    Patch,
    Headers,
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import CreateUserDto from './dto/createUser.dto';
import { UsersService } from './users.service';
import RoleAndJWTAuthenticationGuard from '../authentication/guards/role.and-jwt-authentication.guard';
import BoostaRoles from '../roles/roles.enum';
import RequestWithUser from '../authentication/requestWithUser.interface';
import { PaginationParams } from '../utils/paginationParams';
import FindOneParams from '../utils/findOneParams';
import JwtAuthenticationGuard from '../authentication/guards/jwt-authentication.guard';
import PasswordDto, { UpdatePasswordLocked } from './dto/password.dto';

import BoostaForbiddenException from '../exceptions/forbidden.exception';
import ConfirmPhone from '../confiramtionCode/dto/confirmPhone.dto';
import { ConfirmationCodeService, invalidConfirmationCodeException } from '../confiramtionCode/confirmationCodeService';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ForbiddenAPIResponse, UnauthorizedRequestAPIResponse } from '../utils/http.errors';
import { hashPassword } from '../utils';
import ResendConfirmPhoneCode from '../confiramtionCode/dto/resendConfirmPhone.dto';
import IsActiveWithJWTAuthenticationGuard from '../authentication/guards/isActiveAuthentication.guard';
import BoostaGenericHeader from '../utils/generic.header';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const NUMBER_OF_ROUNDS = 10;

@ApiTags("Users")
@ApiResponse(ForbiddenAPIResponse)
@ApiResponse(ForbiddenAPIResponse)
@ApiResponse(UnauthorizedRequestAPIResponse)
@Controller("users")
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly configService: ConfigService,
        private readonly confirmationService: ConfirmationCodeService,

    ) {
    }


    @EventPattern({ cmd: 'onboarded' })
    async userOnboarded(@Payload() userID: string, @Ctx() context: RmqContext) {
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        channel.ack(originalMsg);
        await this.usersService.markUserOnBoarded(userID);
        console.log("User On-boarded!")
    }


    @Put('reset-password')
    @UseGuards(JwtAuthenticationGuard)
    @ApiBearerAuth()
    @ApiOperation({ description: "The endpoint resets the password of an already logged in user." })
    async updateUserPassword(
        @Body() passwordDto: UpdatePasswordLocked,
        @Req() request: RequestWithUser,
    ) {
        const id = request.user.id;
        await this.usersService.updateUserPasswordLocked(id, passwordDto.existingPassword, passwordDto.newPassword, passwordDto.newPasswordConfirmation)
        return {
            message: "Your password has been successfully changed"
        }
    }

    /**
     * This method receives an emitted message from the event queue.
     * The message notify the auth service about the SMS that was sent.
     * @param context 
     */
    @EventPattern("message-sent")
    async addUser(@Payload() messageData: any, @Ctx() context: RmqContext) {
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        channel.ack(originalMsg);
        this.confirmationService.updateConfirmationCodeSentDetails(messageData)
    }

    @Post('')
    @UseGuards(RoleAndJWTAuthenticationGuard(BoostaRoles.Admin))
    @ApiBearerAuth()
    async createUser(@Body() data: CreateUserDto, @Req() request: RequestWithUser) {
        const requestor = request.user
        const hashedPassword = await hashPassword("test-password", NUMBER_OF_ROUNDS)
        const newUser = await this.usersService.create(data, hashedPassword, requestor)
        return newUser
    }

    @Get('')
    @UseGuards(RoleAndJWTAuthenticationGuard(BoostaRoles.Admin))
    @ApiBearerAuth()
    @ApiQuery({
        name: 'limit',
        type: "number",
        description:
            'The total records to return',
    })
    @ApiQuery({
        name: 'skip',
        type: "number",
        description:
            'The number of records to skip',
    })
    async getAllUsers(@Query() { skip, limit }: PaginationParams) {
        return await this.usersService.getAllUsers(skip, limit)
    }


    @Get(':id')
    @ApiParam({
        name: 'id',
        description: 'User ID',
    })
    @UseGuards(IsActiveWithJWTAuthenticationGuard())
    @ApiBearerAuth()
    async getUser(@Param() { id }: FindOneParams,) {
        return this.usersService.getById((id))
    }

    @Get('with-admin-access/:id')
    @ApiParam({
        name: 'id',
        description: 'User ID',
    })
    async getUserWithAdminAccess(@Param() { id }: FindOneParams, @Headers() headers: BoostaGenericHeader,) {
        const adminSignUpToken: string = headers.adminsignuptoken;
        if (adminSignUpToken != this.configService.get('ADMIN_SIGN_UP_TOKEN'))
            throw new ForbiddenException(
                'You can only register as a Merchant or an Agent',
            );

        return this.usersService.getById((id))
    }

    @Delete(':id')
    @ApiParam({
        name: 'id',
        description: 'User ID',
    })
    @UseGuards(JwtAuthenticationGuard)
    @ApiBearerAuth()
    @UseGuards(RoleAndJWTAuthenticationGuard(BoostaRoles.Admin))
    async deleteUser(@Param() { id }: FindOneParams) {
        return this.usersService.deleteUser((id))
    }

    @Patch(':id/verify-user')
    @ApiParam({
        name: 'id',
        description: 'User ID',
    })
    @UseGuards(JwtAuthenticationGuard)
    @ApiBearerAuth()
    @ApiOperation({ description: "Manually verify the specified user. Only an admin can perform this action." })
    @UseGuards(RoleAndJWTAuthenticationGuard(BoostaRoles.Admin))
    async verifyUser(@Param() { id }: FindOneParams) {
        const user = await this.usersService.getById((id))
        await this.usersService.markPhoneNumberVerified(user.phoneNumber)
        return {
            "message": "User verified"
        }
    }

    @Post('verify-phone')
    @HttpCode(200)
    async verifyPhone(@Body() confirmPhone: ConfirmPhone) {
        await this.usersService.verifyPhoneFromCode(confirmPhone.phoneNumber, confirmPhone.code.toString())
        return {
            "message": `Your account is now active.`
        }
    }

    @Post('resend-verify-phone-confirmation-code')
    @HttpCode(200)
    @ApiOperation({ description: 'The endpoint sends a new confirmation code to the user only if the expiry time has passed. A user can change their phone number by supplying a different phone number in the newPhoneNumber field' })
    async resendVerifyPhoneConfirmationCode(@Body() dataIn: ResendConfirmPhoneCode) {
        await this.usersService.resendConfirmationCode(dataIn.originalPhoneNumber, dataIn.newPhoneNumber)
        return {
            "message": `A new confirmation code has been sent to ${dataIn.newPhoneNumber}`
        }
    }

}
