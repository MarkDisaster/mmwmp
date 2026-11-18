import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RevalidationModule } from '@/revalidation/revalidation.module';

import { SlugRedirectController } from './slug-redirect.controller';
import { SlugRedirectService } from './slug-redirect.service';
import { DeleteSlugRedirectTool } from './tools/delete-slug-redirect.tool';
import { ListSlugRedirectsTool } from './tools/list-slug-redirects.tool';

@Module({
   imports: [PrismaModule, RevalidationModule, AuthModule],
   controllers: [SlugRedirectController],
   providers: [SlugRedirectService, ListSlugRedirectsTool, DeleteSlugRedirectTool],
})
export class SlugRedirectModule {}
