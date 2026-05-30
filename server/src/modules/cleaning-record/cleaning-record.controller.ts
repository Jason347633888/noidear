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
import { IsString, IsBoolean, IsOptional, IsNumber, IsDateString } from 'class-validator';

class CreateFromPlanDto {
  @IsString() area_point_id: string;
  @IsDateString() cleaning_date: string;
  @IsString() @IsOptional() company_id?: string;
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

class CreateNcFromItemDto {
  @IsString() nc_no: string;
}

@ModuleKey('equipment_site')
@Controller('cleaning-records')
@UseGuards(JwtAuthGuard)
export class CleaningRecordController {
  constructor(private service: CleaningRecordService) {}

  @Post()
  create(@Body() dto: CreateCleaningRecordDto, @Request() req: { user: { id: string } }) {
    return this.service.create(dto, req.user.id);
  }

  @Post('from-plan')
  createFromPlan(
    @Body() dto: CreateFromPlanDto,
    @Request() req: { user: { id: string; company_id?: string } },
  ) {
    const companyId = dto.company_id ?? req.user.company_id ?? '1';
    return this.service.createFromActivePlan(
      dto.area_point_id,
      new Date(dto.cleaning_date),
      req.user.id,
      companyId,
    );
  }

  @Get()
  findAll(@Query('target_type') targetType?: string) {
    return this.service.findAll(targetType);
  }

  @Patch(':recordId/items/:itemId/complete')
  completeItem(
    @Param('recordId') recordId: string,
    @Param('itemId') itemId: string,
    @Body() dto: CompleteItemDto,
  ) {
    return this.service.completeItem(recordId, itemId, dto);
  }

  @Post(':recordId/submit')
  submitRecord(@Param('recordId') recordId: string) {
    return this.service.submitRecord(recordId);
  }

  @Post(':recordId/verify')
  verifyRecord(
    @Param('recordId') recordId: string,
    @Body() dto: VerifyRecordDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.verifyRecord(recordId, req.user.id, dto.pass);
  }

  @Post(':recordId/items/:itemId/non-conformance')
  createNcFromItem(
    @Param('recordId') recordId: string,
    @Param('itemId') itemId: string,
    @Body() dto: CreateNcFromItemDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.createNonConformanceFromItem(recordId, itemId, req.user.id, dto.nc_no);
  }
}
