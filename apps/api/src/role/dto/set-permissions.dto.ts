import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, ValidateNested } from 'class-validator';

import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

export class PermissionDto {
   @ApiProperty({ enum: PermissionResource })
   @IsEnum(PermissionResource)
   resource!: PermissionResource;

   @ApiProperty({ enum: PermissionAction })
   @IsEnum(PermissionAction)
   action!: PermissionAction;
}

export class SetPermissionsDto {
   @ApiProperty({ type: [PermissionDto] })
   @IsArray()
   @ValidateNested({ each: true })
   @Type(() => PermissionDto)
   permissions!: PermissionDto[];
}
