import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Quote, Undo, Redo, Minus, Plus } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  fontSize: number;
  onFontSizeChange: (fontSize: number) => void;
}

export function RichTextEditor({ content, onChange, fontSize, onFontSizeChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg">
      <div className="border-b p-2 flex gap-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-accent' : ''} aria-label="Negrito"><Bold className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-accent' : ''} aria-label="Itálico"><Italic className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'bg-accent' : ''} aria-label="Lista"><List className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'bg-accent' : ''} aria-label="Lista numerada"><ListOrdered className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'bg-accent' : ''} aria-label="Citação"><Quote className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().undo().run()} aria-label="Desfazer"><Undo className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().redo().run()} aria-label="Refazer"><Redo className="h-4 w-4" /></Button>
        <div className="ml-2 flex items-center gap-1 border-l pl-2" aria-label="Tamanho do texto da matéria">
          <Button type="button" variant="outline" size="sm" onClick={() => onFontSizeChange(fontSize - 2)} disabled={fontSize <= 14} aria-label="Diminuir tamanho do texto" title="Diminuir texto"><Minus className="h-4 w-4" /></Button>
          <span className="min-w-12 text-center text-xs text-muted-foreground">{fontSize}px</span>
          <Button type="button" variant="outline" size="sm" onClick={() => onFontSizeChange(fontSize + 2)} disabled={fontSize >= 30} aria-label="Aumentar tamanho do texto" title="Aumentar texto"><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
      <EditorContent editor={editor} className="prose max-w-none p-4 min-h-[200px] focus:outline-none" style={{ fontSize: `${fontSize}px` }} />
    </div>
  );
}
