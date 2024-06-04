import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordLocked {
  @IsString()
  @MinLength(8)
  existingPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @MinLength(8)
  newPasswordConfirmation: string;

}

export default UpdatePasswordLocked;
