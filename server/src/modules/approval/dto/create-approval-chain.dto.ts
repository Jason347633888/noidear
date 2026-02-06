import { IsString, IsNotEmpty } from 'class-validator';

export class CreateApprovalChainDto {
  @IsString()
  @IsNotEmpty()
  recordId: string;
}
