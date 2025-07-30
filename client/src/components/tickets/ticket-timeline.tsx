import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  MessageCircle, 
  Clock, 
  Eye, 
  EyeOff, 
  Download, 
  Image as ImageIcon,
  FileText,
  User,
  Settings,
  AlertCircle
} from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'

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
  timeSpent?: number
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

interface TicketTimelineProps {
  interactions: Interaction[]
  showInternalNotes?: boolean
  onToggleInternalNotes?: () => void
  currentUserRole?: string
}

export function TicketTimeline({ 
  interactions, 
  showInternalNotes = false, 
  onToggleInternalNotes,
  currentUserRole = 'agent'
}: TicketTimelineProps) {
  const [expandedInteractions, setExpandedInteractions] = useState<Set<number>>(new Set())

  const toggleExpanded = (interactionId: number) => {
    setExpandedInteractions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(interactionId)) {
        newSet.delete(interactionId)
      } else {
        newSet.add(interactionId)
      }
      return newSet
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageCircle className="h-4 w-4" />
      case 'internal_note':
        return <EyeOff className="h-4 w-4" />
      case 'status_change':
        return <Settings className="h-4 w-4" />
      case 'assignment':
        return <User className="h-4 w-4" />
      case 'time_log':
        return <Clock className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getInteractionTitle = (interaction: Interaction) => {
    switch (interaction.type) {
      case 'comment':
        return interaction.isInternal ? 'Nota interna adicionada' : 'Comentário adicionado'
      case 'internal_note':
        return 'Nota interna'
      case 'status_change':
        return `Status alterado de "${interaction.metadata?.previousStatus}" para "${interaction.metadata?.newStatus}"`
      case 'assignment':
        return `Ticket atribuído para ${interaction.metadata?.newAssignee}`
      case 'time_log':
        return `${interaction.timeSpent}h de trabalho registradas`
      default:
        return 'Atividade'
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const filteredInteractions = interactions.filter(interaction => {
    if (interaction.isInternal && !showInternalNotes) {
      return false
    }
    return true
  })

  const totalTimeSpent = interactions
    .filter(i => i.timeSpent)
    .reduce((sum, i) => sum + (i.timeSpent || 0), 0)

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Histórico do Ticket</h3>
        <div className="flex items-center gap-2">
          {totalTimeSpent > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {totalTimeSpent.toFixed(2)}h total
            </Badge>
          )}
          {(currentUserRole === 'admin' || currentUserRole === 'agent' || currentUserRole === 'manager') && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleInternalNotes}
              className="flex items-center gap-2"
            >
              {showInternalNotes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showInternalNotes ? 'Ocultar notas internas' : 'Mostrar notas internas'}
            </Button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {filteredInteractions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma interação encontrada</p>
            </CardContent>
          </Card>
        ) : (
          filteredInteractions.map((interaction, index) => (
            <Card key={interaction.id} className={`relative ${interaction.isInternal ? 'border-amber-200 bg-amber-50/50' : ''}`}>
              {/* Linha da timeline */}
              {index < filteredInteractions.length - 1 && (
                <div className="absolute left-6 top-16 w-px h-full bg-border z-0" />
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative z-10">
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
                      {interaction.isInternal && (
                        <Badge variant="secondary" className="text-xs">
                          Interno
                        </Badge>
                      )}
                      {interaction.timeSpent && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {interaction.timeSpent}h
                        </Badge>
                      )}
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
                <CardContent className="pt-0">
                  <div className="ml-11 space-y-2">
                    <h4 className="text-sm font-medium">Anexos ({interaction.attachments.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {interaction.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                          {getFileIcon(attachment.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.fileSize)}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
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
