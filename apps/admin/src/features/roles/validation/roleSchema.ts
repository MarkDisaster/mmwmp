import { z } from 'zod/v4';

export const roleSchema = z.object({ name: z.string().min(2) });

export type RoleFormValues = z.infer<typeof roleSchema>;
