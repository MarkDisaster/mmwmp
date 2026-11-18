import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';

import { EditLockController } from './edit-lock.controller';
import { EditLockService } from './edit-lock.service';

@Module({
   imports: [AuthModule],
   controllers: [EditLockController],
   providers: [EditLockService],
   exports: [EditLockService],
})
export class EditLockModule {}
