import { IsPhoneNumber } from 'class-validator';
export class ForgotPasswordDTO {
  @IsPhoneNumber('NG')
  phoneNumber: string;
}

export default ForgotPasswordDTO;
