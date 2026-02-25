import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
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
  Send,
  Maximize2,
  Table as TableIcon,
  Plus,
  Minus,
  Columns,
  Rows
} from 'lucide-react'
import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'

// Extensão customizada de Image que suporta redimensionamento
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: attributes => {
          if (!attributes.width) return {}
          return { width: attributes.width }
        },
      },
      height: {
        default: null,
        renderHTML: attributes => {
          if (!attributes.height) return {}
          return { height: attributes.height }
        },
      },
      style: {
        default: null,
        renderHTML: attributes => {
          if (!attributes.style) return {}
          return { style: attributes.style }
        },
      },
    }
  },
})

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
  const [showImageResizeDialog, setShowImageResizeDialog] = useState(false)
  const [imageWidth, setImageWidth] = useState(100)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      ResizableImage.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
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

  // Editar dimensões de imagem selecionada
  const editImageSize = useCallback(() => {
    if (!editor) return
    
    // Verificar se há uma imagem selecionada
    if (editor.isActive('image')) {
      // Pegar largura atual se existir
      const { style } = editor.getAttributes('image')
      if (style) {
        const match = style.match(/width:\s*(\d+)/)
        if (match) {
          setImageWidth(parseInt(match[1]))
        }
      }
      setShowImageResizeDialog(true)
    } else {
      alert('Selecione uma imagem primeiro clicando nela')
    }
  }, [editor])

  const applyImageResize = useCallback((widthPercent: number) => {
    if (!editor) return
    
    if (widthPercent === 100) {
      // Tamanho original - remover style
      editor.commands.updateAttributes('image', {
        style: null
      })
    } else {
      // Aplicar novo tamanho
      editor.commands.updateAttributes('image', {
        style: `width: ${widthPercent}%; height: auto;`
      })
    }
    setShowImageResizeDialog(false)
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
    <>
    <Card className="w-full shadow-xl hover:shadow-2xl transition-all border-4 border-l-8 border-l-emerald-600 dark:border-l-emerald-400 bg-gradient-to-br from-white via-emerald-50/30 to-white dark:from-gray-800 dark:via-emerald-950/20 dark:to-gray-800">
      <CardHeader className="pb-3 pt-4 bg-gradient-to-r from-emerald-50/80 to-transparent dark:from-emerald-950/30 dark:to-transparent border-b-2 border-emerald-100 dark:border-emerald-900">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Send className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Adicionar Comentário
        </CardTitle>
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
              onClick={editImageSize}
              className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
              title="Redimensionar imagem selecionada"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
              title="Inserir tabela 3x3"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            {editor.isActive('table') && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
                  title="Adicionar coluna"
                >
                  <Plus className="h-3 w-3" />
                  <Columns className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                  className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
                  title="Remover coluna"
                >
                  <Minus className="h-3 w-3" />
                  <Columns className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
                  title="Adicionar linha"
                >
                  <Plus className="h-3 w-3" />
                  <Rows className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().deleteRow().run()}
                  className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
                  title="Remover linha"
                >
                  <Minus className="h-3 w-3" />
                  <Rows className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  className="h-9 p-2 rounded-md flex items-center justify-center text-xs"
                  title="Excluir tabela"
                >
                  × Tabela
                </Button>
              </>
            )}
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

    {/* Dialog de redimensionamento de imagem */}
    <Dialog open={showImageResizeDialog} onOpenChange={setShowImageResizeDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar Tamanho da Imagem</DialogTitle>
          <DialogDescription>
            Arraste o controle para ajustar o tamanho da imagem
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Preview visual do tamanho */}
          <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
            <div 
              className="bg-primary/20 border-2 border-primary rounded transition-all duration-200 flex items-center justify-center"
              style={{ width: `${imageWidth}%`, height: '120px' }}
            >
              <span className="text-sm font-medium">{imageWidth}%</span>
            </div>
          </div>

          {/* Slider de controle */}
          <div className="space-y-2">
            <Label>Largura: {imageWidth}%</Label>
            <Slider
              value={[imageWidth]}
              onValueChange={(value) => setImageWidth(value[0])}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pequeno</span>
              <span>Médio</span>
              <span>Grande</span>
            </div>
          </div>

          {/* Botões de tamanho rápido */}
          <div className="space-y-2">
            <Label className="text-sm">Tamanhos Rápidos:</Label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImageWidth(25)}
                className="text-xs"
              >
                Pequeno<br/>25%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImageWidth(50)}
                className="text-xs"
              >
                Médio<br/>50%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImageWidth(75)}
                className="text-xs"
              >
                Grande<br/>75%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImageWidth(100)}
                className="text-xs"
              >
                Original<br/>100%
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowImageResizeDialog(false)}>
            Cancelar
          </Button>
          <Button onClick={() => applyImageResize(imageWidth)}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
}