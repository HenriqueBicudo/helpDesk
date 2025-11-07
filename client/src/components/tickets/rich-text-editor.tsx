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
  Code,
  Hash,
  Clock,
  Paperclip,
  FileText,
  Send
} from 'lucide-react'
import { useState, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'
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
  ticketId?: number // Adicionar para buscar contratos da empresa do ticket
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
  contractId?: string // Adicionar contrato selecionado
  attachments: File[]
  status?: string
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
  ticketId,
  customerHours,
  templates = []
}: RichTextEditorProps) {
  const [isInternal, setIsInternal] = useState(false) // Padrão: comentário público
  const [timeSpent, setTimeSpent] = useState<string>('00:00') // Mudança: formato HH:MM
  const [selectedContractId, setSelectedContractId] = useState<string>('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Buscar contratos disponíveis para o ticket (baseado na empresa do ticket)
  const { data: availableContracts = [] } = useQuery({
    queryKey: ['ticket-contracts', ticketId],
    queryFn: async () => {
      if (!ticketId) return []
      const response = await apiRequest('GET', `/api/tickets/${ticketId}/contracts`)
      return response.json()
    },
    enabled: !!ticketId && showTimeTracking
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Desabilitar link do StarterKit para usar nossa configuração customizada
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

  // Inserir macro/tag no editor (ex: {{Cliente}}, {{Agente}})
  const insertMacro = (token: string) => {
    if (!editor) return
    // Inserir como texto simples para que o backend processe no /response-templates/:id/process
    editor.chain().focus().insertContent(`${token} `).run()
  }

  const handleSubmit = () => {
    if (!editor) return
    
    const timeDecimal = timeToDecimal(timeSpent)

    // normalizar placeholder 'none' para undefined (sem alteração)
    const normalizedStatus = selectedStatus === 'none' ? undefined : (selectedStatus || undefined)

    const interactionData: InteractionData = {
      content: editor.getHTML(),
      isInternal,
      timeSpent: timeDecimal > 0 ? timeDecimal : undefined,
  contractId: selectedContractId === 'none' ? undefined : (selectedContractId || undefined),
      attachments,
      status: normalizedStatus
    }
    
    onSubmit?.(interactionData)
    
    // Limpar formulário
    editor.commands.clearContent()
    setTimeSpent('00:00')
    setSelectedContractId('')
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
              <span>Horas sobrantes: </span>
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
                      {/* backend may return `title` or `name` depending on source; support both */}
                      {template.name || (template as any).title}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Macros: removido UI de inserção — templates podem conter tokens que o backend processará */}

        {/* Toolbar */}
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
            <Separator orientation="vertical" className="h-6" />
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
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              data-active={editor.isActive('blockquote')}
              className="h-9 w-9 p-2 rounded-md data-[active=true]:bg-muted flex items-center justify-center"
              title="Citação"
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
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={addLink}
              className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
              title="Inserir link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
            {/* Macro button removed — templates may contain tokens like {{Cliente}} which are processed server-side */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
              title="Bloco de código"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
              title="Código inline"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className="h-9 w-9 p-2 rounded-md flex items-center justify-center"
              title="Título H2"
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
              className="prose prose-sm max-w-none p-4 min-h-[220px] focus-within:outline-none [&_.ProseMirror]:min-h-[220px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:w-full [&_.ProseMirror]:resize-none rounded-md bg-card/5 shadow-sm"
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

        {/* Configurações */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="internal" 
                checked={isInternal}
                onCheckedChange={(checked) => setIsInternal(checked === true)}
                className="scale-95"
              />
              <Label htmlFor="internal" className="text-sm">
                Nota interna (não visível ao cliente)
              </Label>
            </div>
            
            {showTimeTracking && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <Input
                    type="time"
                    value={timeSpent}
                    onChange={(e) => setTimeSpent(e.target.value || '00:00')}
                    className="w-24 h-9"
                    step="900" // 15 minutos em segundos
                  />
                  <Label className="text-sm">horas</Label>
                </div>
                
                {/* Seletor de Contrato */}
                {availableContracts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <Select
                      value={selectedContractId}
                      onValueChange={setSelectedContractId}
                    >
                      <SelectTrigger className="w-56 h-9">
                        <SelectValue placeholder="Selecionar contrato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem contrato específico</SelectItem>
                        {availableContracts.map((contract: any) => (
                          <SelectItem key={contract.id} value={contract.id?.toString?.() ?? String(contract.id)}>
                            {contract.contractNumber} - {contract.type} 
                            ({contract.usedHours}h/{contract.includedHours}h)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
            {/* Status change selector: se vazio = sem alteração */}
            <div className="flex items-center gap-2">
              <Label className="text-sm">Alterar status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-44 h-9 text-sm">
                  <SelectValue placeholder="Sem alteração" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem alteração</SelectItem>
                  <SelectItem value="resolved">Concluído</SelectItem>
                  <SelectItem value="closed">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button onClick={handleSubmit} className="ml-auto h-9 px-4 rounded-md bg-primary text-white hover:bg-primary/90 shadow-md flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span>Enviar Resposta</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
