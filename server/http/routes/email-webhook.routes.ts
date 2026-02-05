import { Router, Request, Response } from 'express';
import { db } from '../../db-postgres';
import { tickets, ticketInteractions, users } from '@shared/drizzle-schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Interface para webhook de email recebido
 * Suporta formato do Mailgun, SendGrid, etc.
 */
interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  body?: string;
  html?: string;
  text?: string;
  inReplyTo?: string;
  references?: string;
}

/**
 * Extrair ticket ID do subject ou headers
 */
function extractTicketId(subject: string, inReplyTo?: string, references?: string): number | null {
  // Tentar extrair do subject: "Re: [Ticket #123]"
  const subjectMatch = subject.match(/\[Ticket #(\d+)\]/i) || subject.match(/Ticket #(\d+)/i);
  if (subjectMatch) {
    return parseInt(subjectMatch[1]);
  }

  // Tentar extrair do Message-ID no header In-Reply-To ou References
  // Formato: <ticket-123@domain.com>
  const headers = [inReplyTo, references].filter(Boolean).join(' ');
  const headerMatch = headers.match(/<ticket-(\d+)@/i);
  if (headerMatch) {
    return parseInt(headerMatch[1]);
  }

  return null;
}

/**
 * Limpar conteúdo do email (remover assinaturas, citações antigas)
 */
function cleanEmailContent(html?: string, text?: string): string {
  let content = html || text || '';

  // Remover citações de email anteriores (linhas começando com >)
  if (!html && text) {
    const lines = text.split('\n');
    const cleanLines = [];
    let inQuote = false;

    for (const line of lines) {
      if (line.trim().startsWith('>') || line.includes('wrote:') || line.includes('escreveu:')) {
        inQuote = true;
        continue;
      }
      if (!inQuote) {
        cleanLines.push(line);
      }
    }
    
    content = cleanLines.join('\n').trim();
  }

  // Remover assinaturas comuns
  const signaturePatterns = [
    /--\s*$/m,
    /_{3,}/,
    /Enviado do meu iPhone/i,
    /Sent from my iPhone/i,
    /Get Outlook for/i,
  ];

  for (const pattern of signaturePatterns) {
    const match = content.match(pattern);
    if (match && match.index) {
      content = content.substring(0, match.index);
    }
  }

  return content.trim();
}

/**
 * POST /api/email-webhook/inbound
 * Receber emails via webhook (Mailgun, SendGrid, etc.)
 */
router.post('/inbound', async (req: Request, res: Response) => {
  try {
    console.log('📨 Email recebido via webhook:', {
      from: req.body.from || req.body.sender,
      subject: req.body.subject,
      headers: {
        inReplyTo: req.body['In-Reply-To'],
        references: req.body.References
      }
    });

    // Normalizar formato do webhook (Mailgun, SendGrid, etc.)
    const email: InboundEmail = {
      from: req.body.from || req.body.sender || req.body.email,
      to: req.body.to || req.body.recipient,
      subject: req.body.subject || '',
      html: req.body['body-html'] || req.body.html || req.body.body,
      text: req.body['body-plain'] || req.body.text,
      inReplyTo: req.body['In-Reply-To'] || req.body.inReplyTo,
      references: req.body.References || req.body.references
    };

    // Extrair ticket ID
    const ticketId = extractTicketId(email.subject, email.inReplyTo, email.references);

    if (!ticketId) {
      console.log('⚠️  Não foi possível extrair ticket ID do email');
      return res.status(200).json({ 
        message: 'Email recebido mas ticket ID não identificado',
        action: 'ignored'
      });
    }

    // Verificar se o ticket existe
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    if (!ticket) {
      console.log(`⚠️  Ticket #${ticketId} não encontrado`);
      return res.status(200).json({ 
        message: 'Ticket não encontrado',
        action: 'ignored'
      });
    }

    // Limpar e preparar conteúdo
    const content = cleanEmailContent(email.html, email.text);

    if (!content || content.length < 5) {
      console.log('⚠️  Conteúdo do email vazio ou muito curto');
      return res.status(200).json({ 
        message: 'Email sem conteúdo válido',
        action: 'ignored'
      });
    }

    // Buscar usuário pelo email (ou usar um usuário padrão para respostas externas)
    const emailAddress = email.from.match(/<(.+?)>/)?.[1] || email.from;
    
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, emailAddress));

    // Se não encontrar usuário, usar ID 1 (sistema) e adicionar info do remetente no conteúdo
    let finalContent = content;
    const userId = user?.id || 1;

    if (!user) {
      finalContent = `<p><em>Resposta via email de: ${emailAddress}</em></p>\n${content}`;
    }

    // Criar interação no ticket
    const [interaction] = await db
      .insert(ticketInteractions)
      .values({
        ticketId,
        type: 'comment',
        content: finalContent,
        isInternal: false,
        timeSpent: 0,
        userId,
        createdAt: new Date(),
      })
      .returning();

    console.log(`✅ Interação criada no ticket #${ticketId} via email`);

    res.status(200).json({ 
      message: 'Email processado com sucesso',
      action: 'interaction_created',
      ticketId,
      interactionId: interaction.id
    });

  } catch (error) {
    console.error('❌ Erro ao processar email recebido:', error);
    res.status(500).json({ message: 'Erro ao processar email' });
  }
});

/**
 * POST /api/email-webhook/test
 * Endpoint de teste para simular recebimento de email
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { ticketId, from, content } = req.body;

    if (!ticketId || !from || !content) {
      return res.status(400).json({ 
        message: 'ticketId, from e content são obrigatórios' 
      });
    }

    // Verificar se o ticket existe
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket não encontrado' });
    }

    // Criar interação de teste
    const [interaction] = await db
      .insert(ticketInteractions)
      .values({
        ticketId,
        type: 'comment',
        content: `<p><em>Resposta via email de teste: ${from}</em></p>\n${content}`,
        isInternal: false,
        timeSpent: 0,
        userId: 1,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json({ 
      message: 'Interação de teste criada',
      interaction
    });

  } catch (error) {
    console.error('❌ Erro ao criar interação de teste:', error);
    res.status(500).json({ message: 'Erro ao criar interação de teste' });
  }
});

export default router;
