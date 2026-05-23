import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../shared/decorators/public.decorator';

@ApiTags('健康检查')
@Controller('liveness')
export class LivenessController {
  @Public()
  @Get()
  @ApiOperation({ summary: '进程存活检查（无鉴权，供 Docker healthcheck 使用）' })
  check() {
    return { status: 'ok' };
  }
}
