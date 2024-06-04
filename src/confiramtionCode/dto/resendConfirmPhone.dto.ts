import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPhoneNumber, IsString, isUUID, IsUUID } from 'class-validator';

export default class ResendConfirmPhoneCode {

    @IsPhoneNumber("NG")
    originalPhoneNumber: string

    @IsPhoneNumber("NG")
    newPhoneNumber: string
}

export class SendConfirmPhoneNumber {

    @IsPhoneNumber("NG")
    phoneNumber: string
}