import { OmitType } from '@nestjs/swagger';

import { TagEntity } from './tag.entity';

export class PublicTagEntity extends OmitType(TagEntity, ['version'] as const) {}
