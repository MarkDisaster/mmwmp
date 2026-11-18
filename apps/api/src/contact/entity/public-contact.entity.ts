import { OmitType } from '@nestjs/swagger';

import { ContactEntity } from './contact.entity';

export class PublicContactEntity extends OmitType(ContactEntity, ['version'] as const) {}
