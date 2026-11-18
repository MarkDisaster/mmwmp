import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateRunnerScoreDto } from '../dto/create-runner-score.dto';

const nickErrors = async (nick: unknown) => {
   const dto = plainToInstance(CreateRunnerScoreDto, {
      runId: '5f0c1b2e-8d4a-4f6e-9b1a-2c3d4e5f6a7b',
      nick,
      score: 10,
      seconds: 5,
   });
   const errors = await validate(dto);
   return { dto, errors: errors.filter((error) => error.property === 'nick') };
};

describe('CreateRunnerScoreDto', () => {
   it.each(['M', 'M1', 'MMK', '007'])('accepts the nick %s', async (nick) => {
      expect((await nickErrors(nick)).errors).toEqual([]);
   });

   it('upper-cases and trims the nick', async () => {
      const { dto, errors } = await nickErrors(' m1 ');
      expect(errors).toEqual([]);
      expect(dto.nick).toBe('M1');
   });

   it.each(['', 'MMKA', 'M 1', 'Ř', 12])('refuses the nick %p', async (nick) => {
      expect((await nickErrors(nick)).errors).not.toEqual([]);
   });
});
