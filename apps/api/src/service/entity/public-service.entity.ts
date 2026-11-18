import { OmitType } from '@nestjs/swagger';

import { ServiceEntity } from './service.entity';

export class PublicServiceEntity extends OmitType(ServiceEntity, ['version'] as const) {}
