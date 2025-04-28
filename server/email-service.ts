import { storage } from './storage-interface';
import { EmailTemplateType, type EmailTemplate, type Ticket, type User, type Requester } from '@shared/schema';

/**
 * Interface for email parameters
 */
interface EmailParams {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Interface for template data
 */
interface TemplateData {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Email service class for sending emails
 */
export class EmailService {
  private defaultFromEmail: string;
  
  constructor() {
    this.defaultFromEmail = process.env.DEFAULT_FROM_EMAIL || 'helpdesk@example.com';
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
   * Send an email
   */
  async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      console.log('Enviando email (simulado):', {
        to: params.to,
        from: params.from || this.defaultFromEmail,
        subject: params.subject,
        html: params.html,
        text: params.text
      });
      
      // Em um ambiente de produção, aqui seria usado o SendGrid ou outro serviço
      // Por exemplo:
      // await mailService.send({
      //   to: params.to,
      //   from: params.from || this.defaultFromEmail,
      //   subject: params.subject,
      //   html: params.html,
      //   text: params.text
      // });
      
      return true;
    } catch (error) {
      console.error('Erro ao enviar email:', error);
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
    
    return this.sendEmailWithTemplate('new_ticket', requester.email, {
      requesterName: requester.fullName,
      ticketId: ticket.id,
      ticketSubject: ticket.subject,
      ticketPriority: priorityMap[ticket.priority] || ticket.priority,
      ticketCategory: categoryMap[ticket.category] || ticket.category
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
}

// Singleton instance
export const emailService = new EmailService();