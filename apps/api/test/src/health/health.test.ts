import { getHttpServer } from '../../setup/init';

describe('Health (e2e)', () => {
   it('should answer 200 without a token while the database is up', async () => {
      const response = await getHttpServer().get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.info.database.status).toBe('up');
   });
});
