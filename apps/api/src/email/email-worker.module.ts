import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { UserModule } from '@/user/user.module';

import { EmailModule } from './email.module';
import { EmailProcessor } from './email.processor';

@Module({
   imports: [EmailModule, AuthModule, UserModule],
   providers: [EmailProcessor],
})
export class EmailWorkerModule {}
