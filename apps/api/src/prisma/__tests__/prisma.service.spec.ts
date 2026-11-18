import { buildPoolConfig } from '../prisma.service';

describe('buildPoolConfig', () => {
   it('caps the pool at DATABASE_POOL_MAX connections', () => {
      expect(buildPoolConfig({ DATABASE_POOL_MAX: '4' }).max).toBe(4);
   });

   it('reads the number as the validation does (`1e1` is 10)', () => {
      expect(buildPoolConfig({ DATABASE_POOL_MAX: '1e1' }).max).toBe(10);
   });

   it('keeps the pg default of 10 connections when it is unset', () => {
      expect(buildPoolConfig({}).max).toBe(10);
   });
});
