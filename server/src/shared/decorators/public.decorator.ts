import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 标记一个路由为"公开"，全局 JwtAuthGuard 会跳过该路由的 JWT 校验。
 * 适用于 /auth/login、/liveness 等无需鉴权的端点。
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
