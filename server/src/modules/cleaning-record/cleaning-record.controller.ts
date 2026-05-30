import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CleaningRecordService } from './cleaning-record.service';
import { CreateCleaningRecordDto } from './dto/create-cleaning-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { IsString, IsBoolean, IsOptional, IsNumber, IsDateString } from 'class-validator';

class CreateFromPlanDto {
  @IsString() area_point_id: string;
  @IsDateString() cleaning_date: string;
}

class CompleteItemDto {
  @IsString() result: 'pass' | 'fail';
  @IsString() @IsOptional() remark?: string;
  @IsNumber() @IsOptional() actual_concentration?: number;
  @IsString() @IsOptional() sanitizer_check_id?: string;
  @IsString() @IsOptional() evidence_file_id?: string;
}

class VerifyRecordDto {
  @IsBoolean() pass: boolean;
}

@ModuleKey('equipment_site')
@Controller('cleaning-records')
@UseGuards(JwtAuthGuard)
export class CleaningRecordController {
  constructor(private service: CleaningRecordService) {}

  @Post()
  create(@Body() dto: CreateCleaningRecordDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.id, req.user.companyId);
  }

  @Post('from-plan')
  createFromPlan(
    @Body() dto: CreateFromPlanDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createFromActivePlan(
      dto.area_point_id,
      new Date(dto.cleaning_date),
      req.user.id,
      req.user.companyId,
    );
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest, @Query('target_type') targetType?: string) {
    return this.service.findAll(req.user.companyId, targetType);
  }

  @Patch(':recordId/items/:itemId/complete')
  completeItem(
    @Param('recordId') recordId: string,
    @Param('itemId') itemId: string,
    @Body() dto: CompleteItemDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.completeItem(recordId, itemId, dto, req.user.companyId);
  }

  @Post(':recordId/submit')
  submitRecord(
    @Param('recordId') recordId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.submitRecord(recordId, req.user.companyId);
  }

  @Post(':recordId/verify')
  verifyRecord(
    @Param('recordId') recordId: string,
    @Body() dto: VerifyRecordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.verifyRecord(recordId, req.user.id, dto.pass, req.user.companyId);
  }

  @Post(':recordId/items/:itemId/non-conformance')
  createNcFromItem(
    @Param('recordId') recordId: string,
    @Param('itemId') itemId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createNonConformanceFromItem(recordId, itemId, req.user.id, req.user.companyId);
  }
}
