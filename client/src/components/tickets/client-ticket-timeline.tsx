import { formatDate, getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { 
  MessageCircle, 
  User, 
  CheckCircle,
  FileText
} from 'lucide-react'

interface Attachment {
  id: number
  fileName: string
  originalName: string
  mimeType: string
  fileSize: number
  type: 'image' | 'document' | 'video' | 'other'
  filePath: string
  createdAt: string
}

interface Interaction {
  id: number
  type: 'comment' | 'internal_note' | 'status_change' | 'assignment' | 'time_log'
  content?: string
  isInternal: boolean
  createdAt: string
  user?: {
    id: number
    fullName: string
    role: string
    avatarInitials?: string
  }
  metadata?: {
    previousStatus?: string
    newStatus?: string
    previousAssignee?: string
    newAssignee?: string
  }
  attachments?: Attachment[]
}

interface ClientTicketTimelineProps {
  interactions: Interaction[]
}

// Função para obter ícone baseado no tipo de interação
function getInteractionIcon(type: string) {
  switch (type) {
    case 'comment':
      return <MessageCircle className="h-4 w-4" />
    case 'status_change':
      return <CheckCircle className="h-4 w-4" />
    case 'assignment':
      return <User className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

// Função para obter título baseado no tipo de interação
function getInteractionTitle(interaction: Interaction): string {
  switch (interaction.type) {
    case 'comment':
      return 'Comentário'
    case 'status_change':
      const { previousStatus, newStatus } = interaction.metadata || {}
      return `Status alterado de "${previousStatus}" para "${newStatus}"`
    case 'assignment':
      const { previousAssignee, newAssignee } = interaction.metadata || {}
      if (previousAssignee && newAssignee) {
        return `Atribuição alterada de "${previousAssignee}" para "${newAssignee}"`
      } else if (newAssignee) {
        return `Ticket atribuído para "${newAssignee}"`
      } else {
        return 'Atribuição removida'
      }
    default:
      return 'Atividade do sistema'
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function ClientTicketTimeline({ interactions }: ClientTicketTimelineProps) {
  // Filtrar apenas comentários públicos e mudanças de status para clientes
  const filteredInteractions = interactions.filter(interaction => {
    // Não mostrar comentários internos ou logs de tempo
    if (interaction.isInternal || interaction.type === 'time_log') {
      return false
    }
    
    // Mostrar comentários públicos e mudanças de status
    return interaction.type === 'comment' || interaction.type === 'status_change' || interaction.type === 'assignment'
  })

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Histórico do Ticket</h3>

      {/* Timeline */}
      <div className="space-y-4">
        {filteredInteractions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma interação ainda.</p>
            </CardContent>
          </Card>
        ) : (
          filteredInteractions.map((interaction, index) => (
            <Card key={interaction.id} className="relative">
              {/* Linha conectora */}
              {index < filteredInteractions.length - 1 && (
                <div className="absolute left-[43px] top-16 bottom-0 w-px bg-border" />
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {interaction.user ? getInitials(interaction.user.fullName) : 'SYS'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  {/* Conteúdo do cabeçalho */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getInteractionIcon(interaction.type)}
                      <span className="font-medium text-sm">
                        {getInteractionTitle(interaction)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {interaction.user ? interaction.user.fullName : 'Sistema'}
                      </span>
                      <span>•</span>
                      <span>
                        {formatDate(new Date(interaction.createdAt), 'dd/MM/yyyy às HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {/* Conteúdo da interação */}
              {interaction.content && (
                <CardContent className="pt-0">
                  <div className="ml-11">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: interaction.content }}
                    />
                  </div>
                </CardContent>
              )}

              {/* Anexos */}
              {interaction.attachments && interaction.attachments.length > 0 && (
                <CardContent className="pt-2">
                  <div className="ml-11">
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-muted-foreground">Anexos:</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {interaction.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-3 p-2 border rounded-md bg-muted/10"
                          >
                            <div className="flex items-center justify-center h-8 w-8 rounded bg-muted/20">
                              {attachment.type === 'image' ? (
                                <img 
                                  src={`/uploads/${attachment.fileName}`} 
                                  alt={attachment.originalName}
                                  className="h-6 w-6 rounded object-cover"
                                />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
                            </div>
                            <a
                              href={`/uploads/${attachment.fileName}`}
                              download={attachment.originalName}
                              className="text-xs text-primary hover:underline"
                            >
                              Baixar
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}