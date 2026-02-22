import { PartialType } from '@nestjs/swagger';
import { CreateAlertRuleDto } from './create-alert-rule.dto';

/**
 * 更新告警规则 DTO
 * TASK-364: Alert Management
 */
export class UpdateAlertRuleDto extends PartialType(CreateAlertRuleDto) {}
