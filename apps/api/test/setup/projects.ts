import { getHttpServer } from './init';

type ProjectFields = { slug: string; title?: string } & Record<string, unknown>;

export const createProject = async (
   token: string,
   { slug, title = slug, ...fields }: ProjectFields,
) => {
   const response = await getHttpServer()
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ language: 'cs', title, slug, ...fields })
      .expect(201);
   return response.body as { id: number; slug: string };
};

export const setProjectStatus = async (
   token: string,
   id: number,
   status: 'draft' | 'published',
) => {
   await getHttpServer()
      .patch(`/projects/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status })
      .expect(200);
};
