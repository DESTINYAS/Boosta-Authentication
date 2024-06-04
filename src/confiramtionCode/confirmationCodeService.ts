import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import BoostaNotFoundException from '../exceptions/notFoundExceptions';
import QueuesClientNotifier from '../queues/notifier';
import User from '../users/entities/user.entity';
import { convertToUTC } from '../utils/dates';
import ConfirmationCode from './entities/confirmationCode.entity';
import ConfirmationCodeTypes from './entities/confirmationCodeTypes';

export const invalidConfirmationCodeException = new BadRequestException("The code is either invalid or has expired.")

@Injectable()
export class ConfirmationCodeService {
    constructor(
        @InjectRepository(ConfirmationCode)
        private confirmationCodeRepository: Repository<ConfirmationCode>,
        private readonly queueClients: QueuesClientNotifier,
        private readonly configService: ConfigService
    ) { }


    async throwExceptionIfNotValid(value: string) {
        const confirmationCode = await this.confirmationCodeRepository.findOne({ where: { value: value } })
        if (confirmationCode) {

            const expiringDate = new Date(confirmationCode.createdAt)
            const currentDate = convertToUTC(new Date())
            expiringDate.setSeconds(confirmationCode.createdAt.getSeconds() + confirmationCode.secondsToExpire)

            const maxSeconds = Number.parseInt(this.configService.get("PHONE_VERIFICATION_SECONDS_TO_EXPIRE"))
            const currentTime = currentDate.getTime()

            // * it is not valid
            if (expiringDate.getTime() < currentTime) {
                throw invalidConfirmationCodeException
            } else {
                if (((currentTime - expiringDate.getTime()) / 1000) > maxSeconds) {
                    throw invalidConfirmationCodeException
                }
            }


        } else {
            throw invalidConfirmationCodeException
        }
    }

    async getConfirmationCode(value: string) {
        const confirmationCode = await this.confirmationCodeRepository.findOne({ where: { value: value } })
        if (confirmationCode) {
            return confirmationCode
        }

        throw new BoostaNotFoundException("Confirmation Code", value, "value")
    }

    async getConfirmationCodeByPhoneNumber(phoneNumber: string, confirmationType: ConfirmationCodeTypes = ConfirmationCodeTypes.PHONE_NUMBER) {
        const confirmationCode = await this.confirmationCodeRepository.findOne({ where: { phoneNumber: phoneNumber, confirmationCodeType: confirmationType }, order: { createdAt: 'DESC' } })
        if (confirmationCode) {
            return confirmationCode
        }

        throw new BoostaNotFoundException("Confirmation Code", phoneNumber, "phone number")
    }

    public async markUsed(id: string) {
        const response = await this.confirmationCodeRepository.delete(id)
        if (!response.affected) {
            throw new BoostaNotFoundException("Confirmation Code", id, "ID")
        }
    }

    async sendConfirmationCode(confirmationCodeData: ConfirmationCode) {
        this.queueClients.sendConfirmationCode(confirmationCodeData)
    }

    async createConfirmationCode(userData: User, confirmationCodeType: ConfirmationCodeTypes) {
        const confirmationCode = await this.generateConfirmationCode()
        const createdConfCode = this.confirmationCodeRepository.create({
            value: confirmationCode,
            phoneNumber: userData.phoneNumber,
            secondsToExpire: this.configService.get("PHONE_VERIFICATION_SECONDS_TO_EXPIRE"),
            confirmationCodeType: confirmationCodeType
        })
        return await this.confirmationCodeRepository.save(createdConfCode)
    }

    private async generateConfirmationCode() {
        let randomCode = this.generateRandomFixedFigure()
        let existingCode = await this.confirmationCodeRepository.findOneBy({ value: randomCode })
        while (existingCode) {
            randomCode = this.generateRandomFixedFigure()
            existingCode = await this.confirmationCodeRepository.findOne({ where: { value: randomCode } })
        }
        return randomCode
    }


    private generateRandomFixedFigure(size: number = 6): string {
        let randomValue = Math.random()
        let value = Math.floor(randomValue * 999999)
        while (value.toString().length != size) {
            randomValue = Math.random()
            value = Math.floor(randomValue * 999999)
        }
        return value.toString()
    }

    async regenerateConfirmationCodeIfExpired(userData: User, oldValue: string) {
        const oldConfirmationCode = await this.getConfirmationCode(oldValue)
        try {
            // * if it throws error then the token has indeed expired, generate a new one
            await this.throwExceptionIfNotValid(oldValue)
        } catch (error) {
            await this.confirmationCodeRepository.delete(oldConfirmationCode.id)
            return await this.createConfirmationCode(userData, ConfirmationCodeTypes.PHONE_NUMBER)
        }
        throw new BadRequestException("A new confirmation code can not be generated for this user by this time.")
    }

    async updateConfirmationCodeSentDetails(messageSentData: MessageSentData) {
        const confirmationCodeID = messageSentData?.extras?.confirmationCodeID;

        const confirmationCode = await this.confirmationCodeRepository.findOne({ where: { id:confirmationCodeID } })
        if (!confirmationCode) {
            throw new BoostaNotFoundException("Confirmation Code", messageSentData.extras.confirmationCodeID, "ID")
        }

        confirmationCode.dateSent = messageSentData.timeSent
        confirmationCode.messagingID = messageSentData.messageID
        confirmationCode.messageSent = messageSentData.messageSent
        await this.confirmationCodeRepository.update(messageSentData?.extras?.confirmationCodeID, confirmationCode)
        return this.getConfirmationCode(confirmationCode.value)
    }
}