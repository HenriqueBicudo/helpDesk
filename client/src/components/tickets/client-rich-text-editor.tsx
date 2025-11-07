import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Undo, 
  Redo, 
  Image as ImageIcon, 
  Paperclip,
  FileText,
  Send
} from 'lucide-react'
import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ClientRichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  onSubmit?: (data: ClientInteractionData) => void
  placeholder?: string
}

interface ClientInteractionData {
  content: string
  isInternal: false // Always false for clients
  attachments: File[]
}

export function ClientRichTextEditor({ 
  content = '', 
  onChange, 
  onSubmit,
  placeholder = 'Escreva seu comentário...'
}: ClientRichTextEditorProps) {
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  const addImage = useCallback(() => {
    const url = window.prompt('URL da imagem')
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  // Inserir arquivos de imagem no editor e na lista de anexos
  const insertImageFiles = useCallback((files: File[] | FileList) => {
    const list = Array.from(files)
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

    // adiciona todos os arquivos (incluindo não-imagens) aos attachments
    setAttachments(prev => [...prev, ...list])
  }, [editor])

  // Drag & drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dt = e.dataTransfer
    if (!dt) return
    if (dt.files && dt.files.length > 0) {
      insertImageFiles(dt.files)
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
      insertImageFiles(files)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setAttachments(prev => [...prev, ...files])
    
    // Se for imagem, adicionar no editor também
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

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!editor) return

    const interactionData: ClientInteractionData = {
      content: editor.getHTML(),
      isInternal: false, // Always false for clients
      attachments
    }
    
    onSubmit?.(interactionData)
    
    // Limpar formulário
    editor.commands.clearContent()
    setAttachments([])
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  if (!editor) {
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Adicionar Comentário</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Toolbar Simplificada - Apenas formatação básica */}
        <div className="border rounded-lg">
          <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              data-active={editor.isActive('bold')}
              className="h-9 w-9 p-2 rounded-md data-[active=true]:bg-muted flex items-center justify-center"
              title="Negrito"
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
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              data-active={editor.isActive('bulletList')}
              className="h-9 w-9 p-2 rounded-md data-[active=true]:bg-muted flex items-center justify-center"
              title="Lista"
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
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={addImage}
              className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
              title="Inserir imagem"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
              title="Desfazer"
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
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Editor */}
          <div onDrop={handleDrop} onDragOver={handleDragOver} onPaste={handlePaste}>
            <EditorContent 
              editor={editor} 
              className="prose prose-sm max-w-none p-4 min-h-[150px] focus-within:outline-none [&_.ProseMirror]:min-h-[150px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:w-full [&_.ProseMirror]:resize-none rounded-md bg-card/5 shadow-sm"
            />
          </div>
        </div>

        {/* Anexos */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Anexos</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-3"
            >
              <Paperclip className="h-4 w-4 mr-1" />
              Adicionar Arquivo
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
          </div>
          
          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded bg-muted/20">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium max-w-[260px] truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttachment(index)}
                    aria-label={`Remover anexo ${file.name}`}
                    className="h-8 w-8 flex items-center justify-center"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botão de envio */}
        <div className="flex justify-end">
          <Button onClick={handleSubmit} className="h-9 px-6 rounded-md bg-primary text-white hover:bg-primary/90 shadow-md flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span>Enviar Comentário</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}