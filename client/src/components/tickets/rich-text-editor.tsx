import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
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
  Clock,
  Paperclip,
  FileText,
  Send
} from 'lucide-react'
import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  onSubmit?: (data: InteractionData) => void
  placeholder?: string
  showTemplates?: boolean
  showTimeTracking?: boolean
  customerHours?: {
    monthly: number
    used: number
    remaining: number
  }
  templates?: Array<{
    id: number
    name: string
    content: string
    category: string
  }>
}

interface InteractionData {
  content: string
  isInternal: boolean
  timeSpent?: number
  attachments: File[]
}

// Função para converter HH:MM para decimal
const timeToDecimal = (timeStr: string): number => {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  if (parts.length !== 2) return 0
  const hours = parseInt(parts[0]) || 0
  const minutes = parseInt(parts[1]) || 0
  return hours + (minutes / 60)
}

// Função para converter decimal para HH:MM
const decimalToTime = (decimal: number): string => {
  const hours = Math.floor(decimal)
  const minutes = Math.round((decimal - hours) * 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export function RichTextEditor({ 
  content = '', 
  onChange, 
  onSubmit,
  placeholder = 'Escreva sua resposta...',
  showTemplates = true,
  showTimeTracking = true,
  customerHours,
  templates = []
}: RichTextEditorProps) {
  const [isInternal, setIsInternal] = useState(false) // Padrão: comentário público
  const [timeSpent, setTimeSpent] = useState<string>('00:00') // Mudança: formato HH:MM
  const [attachments, setAttachments] = useState<File[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
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

  const addImage = useCallback(() => {
    const url = window.prompt('URL da imagem')
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const addLink = useCallback(() => {
    const url = window.prompt('URL do link')
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

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

  const handleTemplateSelect = async (templateId: string) => {
    if (!templateId) return;
    
    try {
      const ticketId = window.location.pathname.includes('/tickets/') 
        ? parseInt(window.location.pathname.split('/tickets/')[1]) 
        : null;
      
      // Buscar template processado do backend
      const response = await fetch(`/api/response-templates/${templateId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId
        })
      });
      
      if (response.ok) {
        const processedTemplate = await response.json();
        editor?.commands.setContent(processedTemplate.content);
      } else {
        // Fallback para o template original
        const template = templates.find(t => t.id.toString() === templateId);
        if (template && editor) {
          editor.commands.setContent(template.content);
        }
      }
    } catch (error) {
      console.error('Erro ao processar template:', error);
      // Fallback para o template original
      const template = templates.find(t => t.id.toString() === templateId);
      if (template && editor) {
        editor.commands.setContent(template.content);
      }
    }
    
    setSelectedTemplate('');
  }

  const handleSubmit = () => {
    if (!editor) return
    
    const timeDecimal = timeToDecimal(timeSpent)
    
    const interactionData: InteractionData = {
      content: editor.getHTML(),
      isInternal,
      timeSpent: timeDecimal > 0 ? timeDecimal : undefined,
      attachments
    }
    
    onSubmit?.(interactionData)
    
    // Limpar formulário
    editor.commands.clearContent()
    setTimeSpent('00:00')
    setAttachments([])
    setIsInternal(false) // Resetar para público por padrão
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
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Nova Interação</CardTitle>
          {customerHours && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>Horas restantes: </span>
              <Badge variant={customerHours.remaining < 2 ? "destructive" : customerHours.remaining < 5 ? "secondary" : "default"}>
                {customerHours.remaining.toFixed(1)}h / {customerHours.monthly}h
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Templates */}
        {showTemplates && templates.length > 0 && (
          <div className="space-y-2">
            <Label>Template de Resposta</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                      {template.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Toolbar */}
        <div className="border rounded-lg">
          <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              data-active={editor.isActive('bold')}
              className="data-[active=true]:bg-muted"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              data-active={editor.isActive('italic')}
              className="data-[active=true]:bg-muted"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              data-active={editor.isActive('bulletList')}
              className="data-[active=true]:bg-muted"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              data-active={editor.isActive('orderedList')}
              className="data-[active=true]:bg-muted"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              data-active={editor.isActive('blockquote')}
              className="data-[active=true]:bg-muted"
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={addImage}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={addLink}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Editor */}
          <EditorContent 
            editor={editor} 
            className="prose prose-sm max-w-none p-4 min-h-[200px] focus-within:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:w-full [&_.ProseMirror]:resize-none"
          />
        </div>

        {/* Anexos */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Anexos</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
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
                <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.type)}
                    <span className="text-sm font-medium">{file.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {formatFileSize(file.size)}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttachment(index)}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configurações */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="internal" 
                checked={isInternal}
                onCheckedChange={(checked) => setIsInternal(checked === true)}
              />
              <Label htmlFor="internal" className="text-sm">
                Nota interna (não visível ao cliente)
              </Label>
            </div>
            
            {showTimeTracking && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <Input
                  type="time"
                  value={timeSpent}
                  onChange={(e) => setTimeSpent(e.target.value || '00:00')}
                  className="w-24"
                  step="900" // 15 minutos em segundos
                />
                <Label className="text-sm">horas</Label>
              </div>
            )}
          </div>
          
          <Button onClick={handleSubmit} className="ml-auto">
            <Send className="h-4 w-4 mr-2" />
            Enviar Resposta
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
