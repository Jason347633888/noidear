import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductProcessChangeService } from './product-process-change.service';
import { CreateProductProcessChangeDraftBodyDto } from './dto/product-process-change.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProductProcessChangeController {
  constructor(private readonly service: ProductProcessChangeService) {}

  @Post('/products/:productId/process-changes')
  createDraft(
    @Param('productId') productId: string,
    @Body() dto: CreateProductProcessChangeDraftBodyDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.createDraft(
      { productId, scopes: dto.scopes, payloadJson: dto.payloadJson },
      req.user.id,
    );
  }

  @Post('/product-process-changes/:planId/submit')
  submit(
    @Param('planId') planId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.submitForApproval(planId, req.user.id);
  }
}
