import type { FileEntity } from '@/api/generated';

export type ChatMode = 'fullpage' | 'sidebar' | 'floating' | 'closed';

export type ChatAttachment = {
   clientId: string;
   file: File;
   name: string;
   mimeType: string;
   uploaded?: FileEntity;
   uploadFailed?: boolean;
};

export type Conversation = {
   id: string;
   userId: number;
   title: string | null;
   createdAt: string;
   updatedAt: string;
};
