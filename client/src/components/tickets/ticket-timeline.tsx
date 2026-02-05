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
  showInternalNotes = true, 
  onToggleInternalNotes,
  currentUserRole = 'agent'
}: TicketTimelineProps) {

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
      <Card className="border-2 shadow-md">
        <CardContent className="p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Histórico do Ticket
            </h3>
            <div className="flex items-center gap-2">
              {totalTimeSpent > 0 && (
                <Badge variant="default" className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  <Clock className="h-3 w-3" />
                  {totalTimeSpent.toFixed(2)}h total
                </Badge>
              )}
              {(currentUserRole === 'admin' || currentUserRole === 'agent' || currentUserRole === 'manager') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleInternalNotes}
                  className="flex items-center gap-2 border-2 font-medium"
                >
                  {showInternalNotes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showInternalNotes ? 'Ocultar notas internas' : 'Mostrar notas internas'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-6 relative">
        {/* Linha vertical principal da timeline */}
        <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
        
        {filteredInteractions.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma interação encontrada</p>
            </CardContent>
          </Card>
        ) : (
          filteredInteractions.map((interaction, index) => {
            // Definir cor e estilo baseado em quem fez a interação
            const isAgent = interaction.user && ['admin', 'helpdesk_agent', 'helpdesk_manager'].includes(interaction.user.role)
            const isClient = interaction.user && ['client_user', 'client_manager'].includes(interaction.user.role)
            
            let cardClasses = ''
            let iconColor = ''
            let avatarRing = ''
            let cardBg = ''
            
            if (interaction.isInternal) {
              cardClasses = 'border-l-4 border-l-amber-500 dark:border-l-amber-400'
              iconColor = 'text-amber-600 dark:text-amber-400'
              avatarRing = 'ring-2 ring-amber-400 dark:ring-amber-500'
              cardBg = 'bg-amber-50/50 dark:bg-amber-950/20'
            } else if (isAgent) {
              cardClasses = 'border-l-4 border-l-blue-500 dark:border-l-blue-400'
              iconColor = 'text-blue-600 dark:text-blue-400'
              avatarRing = 'ring-2 ring-blue-400 dark:ring-blue-500'
              cardBg = 'bg-blue-50/50 dark:bg-blue-950/20'
            } else if (isClient) {
              cardClasses = 'border-l-4 border-l-emerald-500 dark:border-l-emerald-400'
              iconColor = 'text-emerald-600 dark:text-emerald-400'
              avatarRing = 'ring-2 ring-emerald-400 dark:ring-emerald-500'
              cardBg = 'bg-emerald-50/50 dark:bg-emerald-950/20'
            } else {
              cardClasses = 'border-l-4 border-l-gray-400 dark:border-l-gray-600'
              iconColor = 'text-gray-600 dark:text-gray-400'
              avatarRing = 'ring-2 ring-gray-300 dark:ring-gray-600'
              cardBg = 'bg-gray-50/50 dark:bg-gray-900/20'
            }
            
            return (
            <div key={interaction.id} className="relative pl-16">
              {/* Círculo na linha do tempo */}
              <div className={`absolute left-4 top-6 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border-4 flex items-center justify-center z-10 shadow-lg ${
                interaction.isInternal ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-200 dark:ring-amber-900' :
                isAgent ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' :
                isClient ? 'border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900' :
                'border-gray-300 dark:border-gray-600 ring-2 ring-gray-200 dark:ring-gray-800'
              }`}>
                <div className={iconColor}>
                  {getInteractionIcon(interaction.type)}
                </div>
              </div>
              
              <Card className={`${cardClasses} ${cardBg} shadow-lg hover:shadow-2xl transition-all border-4`}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <Avatar className={`h-10 w-10 ${avatarRing}`}>
                    <AvatarFallback className={`text-sm font-bold ${
                      interaction.isInternal ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200' :
                      isAgent ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                      isClient ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}>
                      {interaction.user ? getInitials(interaction.user.fullName) : 'SYS'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Conteúdo do cabeçalho */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {interaction.user ? (
                        <>
                          <span className="font-bold text-base text-gray-900 dark:text-gray-100">
                            {interaction.user.fullName}
                          </span>
                          {['client_user', 'client_manager'].includes(interaction.user.role) && (
                            <Badge className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0 font-semibold shadow-sm">
                              Cliente
                            </Badge>
                          )}
                          {['admin', 'helpdesk_agent', 'helpdesk_manager'].includes(interaction.user.role) && (
                            <Badge className="text-xs bg-blue-600 hover:bg-blue-700 text-white border-0 font-semibold shadow-sm">
                              Agente
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="font-bold text-base text-gray-900 dark:text-gray-100">Sistema</span>
                      )}
                      {interaction.isInternal && (
                        <Badge className="text-xs bg-amber-500 hover:bg-amber-600 text-white border-0 font-semibold shadow-sm">
                          🔒 Interno
                        </Badge>
                      )}
                      {interaction.timeSpent && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1 border-2 font-semibold">
                          <Clock className="h-3 w-3" />
                          {interaction.timeSpent}h
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <span>
                        {getInteractionTitle(interaction)}
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
                <CardContent className="pt-4">
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: interaction.content }}
                  />
                </CardContent>
              )}
              
              {/* Anexos */}
              {interaction.attachments && interaction.attachments.length > 0 && (
                <CardContent className="pt-0 pb-4">
                  <Separator className="mb-4" />
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Anexos ({interaction.attachments.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {interaction.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center gap-3 p-3 border-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-sm">
                          <div className={`p-2 rounded-lg ${
                            attachment.type === 'image' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                            'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                          }`}>
                            {getFileIcon(attachment.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">{attachment.originalName}</p>
                            <p className="text-xs text-muted-foreground font-medium">
                              {formatFileSize(attachment.fileSize)}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" className="shrink-0 hover:bg-primary/10">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
            </div>
          )
          })
        )}
      </div>
    </div>
  )
}
