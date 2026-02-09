import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo, 
  Image as ImageIcon, 
  Link as LinkIcon,
  Code,
  Hash
} from 'lucide-react'
import { useCallback, useEffect } from 'react'

interface SimpleRichEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
}

export function SimpleRichEditor({ 
  content = '', 
  onChange, 
  placeholder = 'Escreva o conteúdo do artigo...'
}: SimpleRichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  // Atualiza o conteúdo do editor quando o prop content muda
  // Isso corrige o bug de imagens sendo perdidas ao editar
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const addImage = useCallback(() => {
    const url = window.prompt('URL da imagem')
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
    }
  }, [editor])

  const addLink = useCallback(() => {
    const url = window.prompt('URL do link')
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

  // Drag & drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dt = e.dataTransfer
    if (!dt) return
    if (dt.files && dt.files.length > 0) {
      const list = Array.from(dt.files)
      list.forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (e) => {
            const src = e.target?.result as string
            editor?.chain().focus().setImage({ src }).run()
          }
          reader.readAsDataURL(file)
        }
      })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Paste handler (colar imagens da área de transferência)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (e) => {
            const src = e.target?.result as string
            editor?.chain().focus().setImage({ src }).run()
          }
          reader.readAsDataURL(file)
        }
      })
    }
  }

  if (!editor) {
    return null
  }

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30 rounded-t-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-active={editor.isActive('bold')}
          className="h-9 w-9 p-2 rounded-md data-[active=true]:bg-muted flex items-center justify-center"
          title="Negrito"
          type="button"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          data-active={editor.isActive('italic')}
          className="h-9 w-9 p-2 rounded-md data-[active=true]:bg-muted flex items-center justify-center"
          title="Itálico"
          type="button"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-active={editor.isActive('bulletList')}
          className="h-9 w-9 p-2 rounded-md data-[active=true]:bg-muted flex items-center justify-center"
          title="Lista"
          type="button"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-active={editor.isActive('orderedList')}
          className="h-9 w-9 p-2 rounded-md data-[active=true]:bg-muted flex items-center justify-center"
          title="Lista ordenada"
          type="button"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          data-active={editor.isActive('blockquote')}
          className="h-9 w-9 p-2 rounded-md data-[active=true]:bg-muted flex items-center justify-center"
          title="Citação"
          type="button"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant="ghost"
          size="sm"
          onClick={addImage}
          className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
          title="Inserir imagem"
          type="button"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={addLink}
          className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
          title="Inserir link"
          type="button"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
          title="Bloco de código"
          type="button"
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
          title="Título H2"
          type="button"
        >
          <Hash className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
          title="Desfazer"
          type="button"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
          title="Refazer"
          type="button"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Editor */}
      <div onDrop={handleDrop} onDragOver={handleDragOver} onPaste={handlePaste}>
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none p-4 min-h-[200px] focus-within:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:w-full [&_.ProseMirror]:resize-none rounded-b-lg bg-card/5 shadow-sm"
        />
      </div>
    </div>
  )
}
