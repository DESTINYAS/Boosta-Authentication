import { IsEmail, IsEnum, isNotEmpty, IsOptional, IsNotEmpty, IsPhoneNumber, IsString, MinLength } from "class-validator";
import BoostaRoles from "../../roles/roles.enum";
import Gender from "../../users/entities/gender.enum";

export class RegisterDto {
    @IsPhoneNumber("NG")
    phoneNumber: string;

    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsString()
    @IsNotEmpty()
    middleName: string;

    @IsEnum(Gender)
    gender: Gender;

    @IsString()
    @IsNotEmpty()
    @MinLength(7)
    password: string;

    @IsString()
    @IsNotEmpty()
    homeAddress: string;

    @IsEnum(BoostaRoles)
    role: BoostaRoles;

    @IsString()
    @IsOptional()
    token: string

    @IsEmail()
    @IsOptional()
    email: string

}

export default RegisterDto;