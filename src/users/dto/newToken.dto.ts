import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export default class UpdateTokenDTO {

    @IsString()
    @IsNotEmpty()
    token: string
}
export  class UpdatePinDTO {
    @IsString()
    @IsNotEmpty()
    pin: string
}
export  class ChangePinDTO {
    @IsString()
    @IsNotEmpty()
    oldPin: string
    @IsString()
    @IsNotEmpty()
    newPin: string
}
export  class ChangePinWithCodeDTO {
    @IsString()
    @IsNotEmpty()
    code: string
    @IsString()
    @IsNotEmpty()
    pin: string
    @IsString()
    @IsNotEmpty()
    pinConfirmation: string
}