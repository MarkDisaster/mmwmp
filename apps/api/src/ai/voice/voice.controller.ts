import {
   BadRequestException,
   Body,
   Controller,
   FileTypeValidator,
   MaxFileSizeValidator,
   ParseFilePipe,
   Post,
   Res,
   UploadedFile,
   UseGuards,
   UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
   ApiBearerAuth,
   ApiBody,
   ApiConsumes,
   ApiOperation,
   ApiResponse,
   ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';
import { AUDIO_UPLOAD_MAX_BYTES, singleFileUpload } from '@/config/upload-limits';

import { SynthesizeDto } from './dto/synthesize.dto';
import { VoiceService } from './voice.service';

const ALLOWED_AUDIO_TYPES =
   /^(audio|video)\/(webm|ogg|mpeg|mp3|mp4|x-m4a|m4a|wav|wave|x-wav)(;.*)?$/;

type AuthUser = { id: number };

@ApiTags('AI / Voice')
@Controller('ai/voice')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class VoiceController {
   constructor(private readonly voice: VoiceService) {}

   @Post('transcribe')
   @ApiOperation({
      summary: 'Transcribe an audio recording (server-side STT fallback via OpenAI Whisper)',
   })
   @ApiConsumes('multipart/form-data')
   @ApiBody({
      schema: {
         type: 'object',
         properties: { file: { type: 'string', format: 'binary' } },
         required: ['file'],
      },
   })
   @ApiResponse({
      status: 201,
      schema: {
         type: 'object',
         properties: {
            text: { type: 'string' },
            language: { type: 'string', nullable: true },
         },
      },
   })
   @ApiResponse({ status: 413, description: 'Recording larger than 25 MB' })
   @UseInterceptors(FileInterceptor('file', singleFileUpload(AUDIO_UPLOAD_MAX_BYTES)))
   async transcribe(
      @UploadedFile(
         new ParseFilePipe({
            validators: [
               new MaxFileSizeValidator({ maxSize: AUDIO_UPLOAD_MAX_BYTES }),
               new FileTypeValidator({ fileType: ALLOWED_AUDIO_TYPES }),
            ],
         }),
      )
      file: Express.Multer.File,
      @CurrentUser() user: AuthUser,
   ): Promise<{ text: string; language: string | null }> {
      return this.voice.transcribe(file, user.id);
   }

   @Post('synthesize')
   @ApiOperation({ summary: 'Synthesize text to MP3 (OpenAI TTS)' })
   @ApiBody({ type: SynthesizeDto })
   @ApiResponse({ status: 201, description: 'MP3 audio stream' })
   async synthesize(
      @Body() body: SynthesizeDto,
      @CurrentUser() user: AuthUser,
      @Res() res: Response,
   ): Promise<void> {
      if (!body.text?.trim()) {
         throw new BadRequestException('Text is required.');
      }
      const { audio, cached } = await this.voice.synthesize(
         body.text,
         body.voice ?? 'nova',
         user.id,
      );
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audio.length.toString());
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
      res.end(audio);
   }
}
