import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const TTS_VOICES = ['nova', 'alloy', 'echo', 'onyx', 'shimmer', 'fable'] as const;
export type TtsVoice = (typeof TTS_VOICES)[number];

const MAX_TTS_INPUT_CHARS = 4096;

export class SynthesizeDto {
   @ApiProperty({ description: 'Text to synthesize', maxLength: MAX_TTS_INPUT_CHARS })
   @IsString()
   @MinLength(1)
   @MaxLength(MAX_TTS_INPUT_CHARS)
   text!: string;

   @ApiProperty({ enum: TTS_VOICES, required: false, default: 'nova' })
   @IsOptional()
   @IsString()
   @IsIn(TTS_VOICES as unknown as string[])
   voice?: TtsVoice;
}
