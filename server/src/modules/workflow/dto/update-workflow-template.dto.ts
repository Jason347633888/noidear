import { PartialType } from '@nestjs/swagger';
import { CreateWorkflowTemplateDto } from './create-workflow-template.dto';

/**
 * 更新工作流模板 DTO
 */
export class UpdateWorkflowTemplateDto extends PartialType(CreateWorkflowTemplateDto) {}
