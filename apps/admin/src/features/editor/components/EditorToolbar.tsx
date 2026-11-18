import { cn } from '@mm/utils/cn';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import type { LucideIcon } from 'lucide-react';
import {
   BetweenHorizontalEnd,
   BetweenVerticalEnd,
   Bold,
   Code,
   Columns3,
   Heading2,
   Heading3,
   ImageIcon,
   Italic,
   Link as LinkIcon,
   List,
   ListOrdered,
   Redo,
   Rows3,
   Strikethrough,
   Table,
   Trash2,
   Undo,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

type TextFormat = {
   label: string;
   icon: LucideIcon;
   toggle: (editor: Editor) => void;
   isActive: (editor: Editor) => boolean;
};

const TEXT_FORMATS: TextFormat[] = [
   {
      label: 'textEditor.bold',
      icon: Bold,
      toggle: (editor) => editor.chain().focus().toggleBold().run(),
      isActive: (editor) => editor.isActive('bold'),
   },
   {
      label: 'textEditor.italic',
      icon: Italic,
      toggle: (editor) => editor.chain().focus().toggleItalic().run(),
      isActive: (editor) => editor.isActive('italic'),
   },
   {
      label: 'textEditor.strike',
      icon: Strikethrough,
      toggle: (editor) => editor.chain().focus().toggleStrike().run(),
      isActive: (editor) => editor.isActive('strike'),
   },
   {
      label: 'textEditor.heading2',
      icon: Heading2,
      toggle: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: (editor) => editor.isActive('heading', { level: 2 }),
   },
   {
      label: 'textEditor.heading3',
      icon: Heading3,
      toggle: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: (editor) => editor.isActive('heading', { level: 3 }),
   },
   {
      label: 'textEditor.bulletList',
      icon: List,
      toggle: (editor) => editor.chain().focus().toggleBulletList().run(),
      isActive: (editor) => editor.isActive('bulletList'),
   },
   {
      label: 'textEditor.orderedList',
      icon: ListOrdered,
      toggle: (editor) => editor.chain().focus().toggleOrderedList().run(),
      isActive: (editor) => editor.isActive('orderedList'),
   },
];

type TableAction = {
   label: string;
   icon: LucideIcon;
   run: (editor: Editor) => void;
};

const TABLE_ACTIONS: TableAction[] = [
   {
      label: 'textEditor.addRow',
      icon: BetweenHorizontalEnd,
      run: (editor) => editor.chain().focus().addRowAfter().run(),
   },
   {
      label: 'textEditor.addColumn',
      icon: BetweenVerticalEnd,
      run: (editor) => editor.chain().focus().addColumnAfter().run(),
   },
   {
      label: 'textEditor.deleteRow',
      icon: Rows3,
      run: (editor) => editor.chain().focus().deleteRow().run(),
   },
   {
      label: 'textEditor.deleteColumn',
      icon: Columns3,
      run: (editor) => editor.chain().focus().deleteColumn().run(),
   },
   {
      label: 'textEditor.deleteTable',
      icon: Trash2,
      run: (editor) => editor.chain().focus().deleteTable().run(),
   },
];

type ToolbarButtonProps = {
   label: string;
   onClick: () => void;
   isActive?: boolean;
   disabled?: boolean;
   children: ReactNode;
};

const ToolbarButton = ({ label, onClick, isActive, disabled, children }: ToolbarButtonProps) => (
   <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={cn(isActive && 'bg-accent')}
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      onClick={onClick}
   >
      {children}
   </Button>
);

type EditorToolbarProps = {
   editor: Editor;
   onLinkClick: () => void;
   onImageClick: () => void;
   onHtmlSourceClick: () => void;
};

export const EditorToolbar = ({
   editor,
   onLinkClick,
   onImageClick,
   onHtmlSourceClick,
}: EditorToolbarProps) => {
   const { t } = useTranslation();

   const state = useEditorState({
      editor,
      selector: ({ editor: current }) => ({
         activeFormats: TEXT_FORMATS.map((format) => format.isActive(current)),
         isLink: current.isActive('link'),
         isTable: current.isActive('table'),
         isSelectionEmpty: current.state.selection.empty,
      }),
   });

   return (
      <div className="sticky top-0 z-10 flex flex-wrap gap-1 rounded-t-md border-b bg-background p-2">
         {TEXT_FORMATS.map(({ label, icon: Icon, toggle }, index) => (
            <ToolbarButton
               key={label}
               label={t(label)}
               onClick={() => toggle(editor)}
               isActive={state.activeFormats[index]}
            >
               <Icon className="h-4 w-4" />
            </ToolbarButton>
         ))}
         <ToolbarButton
            label={t('textEditor.link')}
            onClick={onLinkClick}
            isActive={state.isLink}
            disabled={!state.isLink && state.isSelectionEmpty}
         >
            <LinkIcon className="h-4 w-4" />
         </ToolbarButton>
         <ToolbarButton label={t('textEditor.image')} onClick={onImageClick}>
            <ImageIcon className="h-4 w-4" />
         </ToolbarButton>
         <ToolbarButton
            label={t('textEditor.table')}
            onClick={() =>
               editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            isActive={state.isTable}
         >
            <Table className="h-4 w-4" />
         </ToolbarButton>
         {TABLE_ACTIONS.map(({ label, icon: Icon, run }) => (
            <ToolbarButton
               key={label}
               label={t(label)}
               onClick={() => run(editor)}
               disabled={!state.isTable}
            >
               <Icon className="h-4 w-4" />
            </ToolbarButton>
         ))}
         <ToolbarButton label={t('textEditor.htmlSource')} onClick={onHtmlSourceClick}>
            <Code className="h-4 w-4" />
         </ToolbarButton>
         <ToolbarButton
            label={t('textEditor.undo')}
            onClick={() => editor.chain().focus().undo().run()}
         >
            <Undo className="h-4 w-4" />
         </ToolbarButton>
         <ToolbarButton
            label={t('textEditor.redo')}
            onClick={() => editor.chain().focus().redo().run()}
         >
            <Redo className="h-4 w-4" />
         </ToolbarButton>
      </div>
   );
};
