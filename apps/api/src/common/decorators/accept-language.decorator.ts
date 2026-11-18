import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

import { Language } from '@/generated/prisma/enums';

const LANGUAGES = Object.values(Language);

export const getAcceptedLanguage = (request: Request): Language | undefined => {
   if (request.acceptsLanguages().every((tag) => tag === '*')) return undefined;
   const match = request.acceptsLanguages(...LANGUAGES);
   return LANGUAGES.find((language) => language === match);
};

export const AcceptLanguage = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
   getAcceptedLanguage(ctx.switchToHttp().getRequest<Request>()),
);
