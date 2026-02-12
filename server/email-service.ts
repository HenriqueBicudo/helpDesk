import { storage } from './storage-interface';
import { EmailTemplateType, type EmailTemplate, type Ticket, type User, type Requester } from '@shared/schema';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Interface for email parameters
 */
interface EmailParams {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
}

/**
 * Interface for template data
 */
interface TemplateData {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Email service class for sending emails with SMTP support
 */
export class EmailService {
  private defaultFromEmail: string;
  private defaultFromName: string;
  private transporter: Transporter | null = null;
  private smtpEnabled: boolean = false;
  
  constructor() {
    this.defaultFromEmail = process.env.FROM_EMAIL || process.env.SMTP_FROM_EMAIL || 'helpdesk@example.com';
    this.defaultFromName = process.env.SMTP_FROM_NAME || 'HelpDesk System';
    this.initializeTransporter();
  }
  
  /**
   * Initialize SMTP transporter if credentials are available
   */
  private initializeTransporter(): void {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    
    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      try {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort),
          secure: process.env.SMTP_SECURE === 'true', // true para 465, false para 587
          auth: {
            user: smtpUser,
            pass: smtpPass.replace(/\s/g, '') // Remove espaços da senha
          }
        });
        
        this.smtpEnabled = true;
        console.log(`✅ SMTP configurado: ${smtpHost}:${smtpPort} (${smtpUser})`);
      } catch (error) {
        console.error('❌ Erro ao configurar SMTP:', error);
        this.smtpEnabled = false;
      }
    } else {
      console.log('ℹ️  SMTP não configurado - emails serão simulados');
      this.smtpEnabled = false;
    }
  }
  
  /**
   * Replace template variables with actual values
   */
  private processTemplate(template: string, data: TemplateData): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key]?.toString() || match;
    });
  }
  
  /**
   * Get email template by type
   */
  private async getTemplate(type: EmailTemplateType): Promise<EmailTemplate | undefined> {
    return storage.getEmailTemplateByType(type, true);
  }
  
  /**
   * Send an email using SMTP or simulate if not configured
   */
  async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      const fromAddress = `"${this.defaultFromName}" <${params.from || this.defaultFromEmail}>`;
      
      if (this.smtpEnabled && this.transporter) {
        // Enviar email real via SMTP
        const mailOptions: any = {
          from: fromAddress,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text
        };

        // Adicionar headers para manter thread de email
        if (params.messageId) {
          mailOptions.messageId = params.messageId;
        }
        if (params.inReplyTo) {
          mailOptions.inReplyTo = params.inReplyTo;
        }
        if (params.references) {
          mailOptions.references = params.references;
        }

        const info = await this.transporter.sendMail(mailOptions);
        
        console.log('✅ Email enviado:', {
          to: params.to,
          subject: params.subject,
          messageId: info.messageId,
          inReplyTo: params.inReplyTo
        });
        
        return true;
      } else {
        // Simular envio de email
        console.log('📧 Email simulado:', {
          to: params.to,
          from: fromAddress,
          subject: params.subject,
          messageId: params.messageId,
          inReplyTo: params.inReplyTo,
          html: params.html ? `${params.html.substring(0, 100)}...` : undefined,
          text: params.text
        });
        
        return true;
      }
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return false;
    }
  }
  
  /**
   * Send email from template
   */
  async sendEmailWithTemplate(
    type: EmailTemplateType, 
    to: string, 
    data: TemplateData
  ): Promise<boolean> {
    try {
      const template = await this.getTemplate(type);
      if (!template) {
        console.error(`Template de email "${type}" não encontrado`);
        return false;
      }
      
      const subject = this.processTemplate(template.subject, data);
      const html = this.processTemplate(template.body, data);
      
      return this.sendEmail({
        to,
        from: this.defaultFromEmail,
        subject,
        html
      });
    } catch (error) {
      console.error('Erro ao enviar email com template:', error);
      return false;
    }
  }
  
  /**
   * Send new ticket notification
   */
  async sendNewTicketNotification(ticket: Ticket, requester: Requester): Promise<boolean> {
    const categoryMap: Record<string, string> = {
      'technical_support': 'Suporte Técnico',
      'financial': 'Financeiro',
      'commercial': 'Comercial',
      'other': 'Outro'
    };
    
    const priorityMap: Record<string, string> = {
      'low': 'Baixa',
      'medium': 'Média',
      'high': 'Alta',
      'critical': 'Crítica'
    };

    // Usar o emailThreadId do ticket como Message-ID inicial
    const messageId = (ticket as any).emailThreadId || this.generateMessageId(ticket.id);
    const subject = `[Ticket #${ticket.id}] ${ticket.subject}`;

    const html = `
${ticket.description}

<br><br>
--<br>
<small style="color: #666;">
Para responder este ticket, basta responder este email.<br>
<a href="${process.env.APP_URL || 'http://localhost:3000'}/tickets/${ticket.id}">Ver ticket #${ticket.id}</a>
</small>
    `.trim();

    const text = `
${ticket.description.replace(/<[^>]*>/g, '')}

--
Para responder este ticket, basta responder este email.
Ver ticket: ${process.env.APP_URL || 'http://localhost:3000'}/tickets/${ticket.id}
Ticket ID: #${ticket.id}
    `.trim();

    return this.sendEmail({
      to: requester.email,
      from: this.defaultFromEmail,
      subject,
      html,
      text,
      messageId
    });
  }
  
  /**
   * Send ticket update notification
   */
  async sendTicketUpdateNotification(
    ticket: Ticket, 
    requester: Requester,
    assignee: User | undefined,
    updateDetails: string
  ): Promise<boolean> {
    const statusMap: Record<string, string> = {
      'open': 'Aberto',
      'in_progress': 'Em Andamento',
      'pending': 'Pendente',
      'resolved': 'Resolvido',
      'closed': 'Fechado'
    };
    
    return this.sendEmailWithTemplate('ticket_update', requester.email, {
      requesterName: requester.fullName,
      ticketId: ticket.id,
      ticketSubject: ticket.subject,
      ticketStatus: statusMap[ticket.status] || ticket.status,
      assigneeName: assignee?.fullName || 'Não atribuído',
      updateDetails
    });
  }
  
  /**
   * Send ticket resolution notification
   */
  async sendTicketResolutionNotification(
    ticket: Ticket,
    requester: Requester,
    resolutionDetails: string
  ): Promise<boolean> {
    return this.sendEmailWithTemplate('ticket_resolution', requester.email, {
      requesterName: requester.fullName,
      ticketId: ticket.id,
      ticketSubject: ticket.subject,
      resolutionDetails
    });
  }
  
  /**
   * Send ticket assignment notification
   */
  async sendTicketAssignmentNotification(
    ticket: Ticket,
    requester: Requester,
    assignee: User
  ): Promise<boolean> {
    const priorityMap: Record<string, string> = {
      'low': 'Baixa',
      'medium': 'Média',
      'high': 'Alta',
      'critical': 'Crítica'
    };
    
    return this.sendEmailWithTemplate('ticket_assignment', requester.email, {
      requesterName: requester.fullName,
      ticketId: ticket.id,
      ticketSubject: ticket.subject,
      assigneeName: assignee.fullName,
      ticketPriority: priorityMap[ticket.priority] || ticket.priority
    });
  }

  /**
   * Generate Message-ID for email threading
   */
  private generateMessageId(ticketId: number, interactionId?: number): string {
    const domain = this.defaultFromEmail.split('@')[1] || 'helpdesk.local';
    const timestamp = Date.now();
    
    if (interactionId) {
      // Message-ID único para cada interação
      return `<ticket-${ticketId}-interaction-${interactionId}-${timestamp}@${domain}>`;
    } else {
      // Message-ID inicial do ticket (thread)
      return `<ticket-${ticketId}@${domain}>`;
    }
  }

  /**
   * Get or create thread Message-ID for ticket
   */
  private async getThreadMessageId(ticketId: number): Promise<string> {
    const domain = this.defaultFromEmail.split('@')[1] || 'helpdesk.local';
    return `<ticket-${ticketId}@${domain}>`;
  }

  /**
   * Send ticket interaction notification to requesters and CC
   */
  async sendTicketInteractionNotification(
    ticket: Ticket & { emailThreadId?: string | null },
    interaction: { id?: number; type: string; content: string; isInternal: boolean; createdBy: number },
    author: User,
    requesters: Array<{ email: string; fullName: string }>,
    ccRecipients: Array<{ email: string; name: string | null }>
  ): Promise<void> {
    // Não enviar emails para interações internas
    if (interaction.isInternal) {
      console.log('ℹ️  Interação interna - email não enviado');
      return;
    }

    const interactionTypeMap: Record<string, string> = {
      'comment': 'Comentário',
      'note': 'Nota',
      'status_change': 'Mudança de Status',
      'assignment': 'Atribuição'
    };

    // Obter ou criar Message-ID da thread
    const threadMessageId = ticket.emailThreadId || await this.getThreadMessageId(ticket.id);
    
    // Gerar Message-ID único para esta interação
    const interactionMessageId = this.generateMessageId(ticket.id, interaction.id);

    // Manter subject original - adicionar Re: apenas se não tiver
    const subject = ticket.subject.startsWith('Re:') || ticket.subject.includes('[Ticket #') 
      ? ticket.subject 
      : `[Ticket #${ticket.id}] ${ticket.subject}`;
    
    const html = `
${interaction.content}

<br><br>
--<br>
<small style="color: #666;">
Para responder este ticket, basta responder este email.<br>
<a href="${process.env.APP_URL || 'http://localhost:3000'}/tickets/${ticket.id}">Ver ticket #${ticket.id}</a>
</small>
    `.trim();

    const text = `
${interaction.content.replace(/<[^>]*>/g, '')}

--
Para responder este ticket, basta responder este email.
Ver ticket: ${process.env.APP_URL || 'http://localhost:3000'}/tickets/${ticket.id}
Ticket ID: #${ticket.id}
    `.trim();

    // Coletar todos os destinatários únicos
    const allRecipients = new Set<string>();
    
    // Adicionar solicitantes
    requesters.forEach(r => {
      if (r.email && r.email !== author.email) { // Não enviar para o autor
        allRecipients.add(r.email);
      }
    });
    
    // Adicionar pessoas em cópia
    ccRecipients.forEach(cc => {
      if (cc.email && cc.email !== author.email) { // Não enviar para o autor
        allRecipients.add(cc.email);
      }
    });

    // Enviar emails com threading headers corretos
    const emailPromises = Array.from(allRecipients).map(email => 
      this.sendEmail({
        to: email,
        from: this.defaultFromEmail,
        subject,
        html,
        text,
        messageId: interactionMessageId,
        inReplyTo: threadMessageId,
        references: threadMessageId
      })
    );

    await Promise.all(emailPromises);
    
    console.log(`📧 Notificações de interação enviadas para ${allRecipients.size} destinatário(s)`);
  }
}

// Singleton instance
export const emailService = new EmailService();