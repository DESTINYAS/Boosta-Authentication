import { IsString, MinLength } from 'class-validator';

export class ConfirmationCode {
  @IsString()
  @MinLength(3)
  confirmationCode: string;
}

export default ConfirmationCode;
