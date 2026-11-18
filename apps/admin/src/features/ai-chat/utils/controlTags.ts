export const VOICE_TAG = '[voice]';

export const AUTO_EDIT_TAG = '[auto-edit]';

const ATTACHMENT_NOTE_PREFIX = '[Přílohy: ';

type NotedFile = { fileId: number; name: string };

type UserMessageText = {
   text: string;
   files: NotedFile[];
   fromVoice: boolean;
   autoEdit: boolean;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const TRAILING_TAGS = new RegExp(
   `(?:\\s*(?:${[VOICE_TAG, AUTO_EDIT_TAG].map(escapeRegExp).join('|')}))+\\s*$`,
);
const TRAILING_ATTACHMENT_NOTE = new RegExp(
   `\\s*${escapeRegExp(ATTACHMENT_NOTE_PREFIX)}[^\\n]*\\]\\s*$`,
);

export const buildUserMessageText = ({ text, files, fromVoice, autoEdit }: UserMessageText) => {
   const note =
      files.length > 0
         ? `\n\n${ATTACHMENT_NOTE_PREFIX}${files
              .map((f) => `fileId=${f.fileId} (${f.name})`)
              .join(', ')}]`
         : '';
   const voice = fromVoice ? ` ${VOICE_TAG}` : '';
   const edit = autoEdit ? ` ${AUTO_EDIT_TAG}` : '';
   return `${text}${note}${voice}${edit}`;
};

export const stripControlTags = (text: string) =>
   text.replace(TRAILING_TAGS, '').replace(TRAILING_ATTACHMENT_NOTE, '');
