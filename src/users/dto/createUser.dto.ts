
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";
import BoostaRoles from "../../roles/roles.enum";
import Gender from "../../users/entities/gender.enum";

export class CreateUserDto {

    @MinLength(11)
    @MaxLength(15)
    phoneNumber: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    firstName: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    lastName: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    middleName: string;

    @IsString()
    @MaxLength(100)
    homeAddress: string;

    @IsBoolean()
    isPhoneVerified: boolean;

    @IsEnum(Gender)
    @IsNotEmpty()
    gender: Gender;

    @IsEnum(BoostaRoles)
    @IsNotEmpty()
    role: BoostaRoles;


}

export default CreateUserDto;