import { IsNumber, IsPhoneNumber, MaxLength, MinLength } from "class-validator";

export default class ConfirmPhone {
    @IsPhoneNumber("NG")
    @MaxLength(15)
    phoneNumber: string

    @IsNumber()
    code: number
}

export class ConfirmPassword {
    @MinLength(8)
    @MaxLength(100)
    password: string

    @MinLength(8)
    @MaxLength(100)
    passwordConfirmation: string

    @IsNumber()
    code: number
}