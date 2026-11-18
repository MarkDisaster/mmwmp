import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

import { clientIp } from '@/common/request/client-ip';

export const ClientIp = createParamDecorator(
   (_data: unknown, ctx: ExecutionContext) =>
      clientIp(ctx.switchToHttp().getRequest<Request>()) ?? 'unknown',
);
