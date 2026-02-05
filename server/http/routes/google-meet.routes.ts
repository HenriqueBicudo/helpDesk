import { Router } from 'express';
import { db } from '../../db-postgres';
import { tickets, users, ticketCc } from '../../../shared/drizzle-schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../../middleware/auth';
import { googleCalendarService } from '../../services/google-calendar.service';

const router = Router();

/**
 * POST /api/tickets/:id/create-meet
 * Cria uma reunião do Google Meet via Google Calendar API e envia convites
 */
router.post('/tickets/:id/create-meet', requireAuth, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { date, time, duration = 60, summary } = req.body;

    // Validar parâmetros
    if (!date || !time) {
      return res.status(400).json({ error: 'Data e horário são obrigatórios' });
    }

    // Verificar se a API está configurada
    if (!googleCalendarService.isConfigured()) {
      return res.status(503).json({ 
        error: 'Google Calendar API não configurada',
        message: 'Configure as variáveis de ambiente GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REFRESH_TOKEN'
      });
    }
    
    // Buscar o ticket com todas as relações necessárias
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    // Buscar solicitante principal
    const [requester] = await db
      .select()
      .from(users)
      .where(eq(users.id, ticket.requesterId))
      .limit(1);

    // Buscar agente responsável (se houver)
    let assignee = null;
    if (ticket.assigneeId) {
      [assignee] = await db
        .select()
        .from(users)
        .where(eq(users.id, ticket.assigneeId))
        .limit(1);
    }

    // Buscar pessoas em cópia (CC) - da tabela ticket_cc
    const ccParticipants = await db
      .select({
        email: ticketCc.email,
        name: ticketCc.name,
      })
      .from(ticketCc)
      .where(eq(ticketCc.ticketId, ticketId));

    // Coletar todos os participantes
    const attendees = [];
    
    if (requester?.email) {
      attendees.push({
        email: requester.email,
        displayName: requester.fullName,
      });
    }
    
    if (assignee?.email) {
      attendees.push({
        email: assignee.email,
        displayName: assignee.fullName,
      });
    }
    
    ccParticipants.forEach(cc => {
      if (cc.email) {
        attendees.push({
          email: cc.email,
          displayName: cc.name || undefined,
        });
      }
    });

    // Remover duplicatas por email
    const uniqueAttendees = attendees.filter(
      (attendee, index, self) =>
        index === self.findIndex((a) => a.email === attendee.email)
    );

    // Criar data/hora ISO 8601
    const startDateTime = `${date}T${time}:00`;

    // Criar evento no Google Calendar com Google Meet
    const meetingEvent = await googleCalendarService.createMeetingEvent({
      summary: summary || `Reunião - Ticket #${ticket.id}`,
      description: `Reunião relacionada ao ticket #${ticket.id} - ${ticket.subject}\n\nParticipantes: ${uniqueAttendees.map(a => a.displayName || a.email).join(', ')}`,
      startDateTime,
      durationMinutes: duration,
      attendees: uniqueAttendees,
      timezone: 'America/Sao_Paulo',
    });

    console.log('✅ Google Meet criado:', {
      ticketId,
      eventId: meetingEvent.eventId,
      meetLink: meetingEvent.meetLink,
      attendees: uniqueAttendees.length,
    });

    return res.json({
      success: true,
      eventId: meetingEvent.eventId,
      meetLink: meetingEvent.meetLink,
      htmlLink: meetingEvent.htmlLink,
      attendees: uniqueAttendees,
      message: 'Reunião criada com sucesso. Convites enviados por email.',
    });

  } catch (error) {
    console.error('❌ Erro ao criar Google Meet:', error);
    return res.status(500).json({ 
      error: 'Erro ao criar Google Meet',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/google/auth
 * Retorna URL para autenticação OAuth2 (primeira configuração)
 */
router.get('/google/auth', requireAuth, async (req, res) => {
  try {
    const authUrl = googleCalendarService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Erro ao gerar URL de autenticação:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erro ao gerar URL de autenticação' 
    });
  }
});

/**
 * GET /api/google/callback
 * Callback OAuth2 - troca código por tokens
 */
router.get('/google/callback', async (req, res) => {
  try {
    const code = req.query.code as string;
    
    if (!code) {
      return res.status(400).send('Código de autorização não fornecido');
    }

    const tokens = await googleCalendarService.getTokensFromCode(code);
    
    res.send(`
      <html>
        <head><title>Autenticação Google Calendar</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h2>✅ Autenticação concluída!</h2>
          <p>Copie o <strong>refresh_token</strong> abaixo e adicione à variável de ambiente <code>GOOGLE_REFRESH_TOKEN</code>:</p>
          <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">${tokens.refresh_token || 'Refresh token já existe no servidor'}</pre>
          <p><strong>Access Token (temporário):</strong></p>
          <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">${tokens.access_token}</pre>
          <p style="color: #666; font-size: 14px;">Você pode fechar esta janela.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Erro no callback OAuth:', error);
    res.status(500).send('Erro ao processar autenticação: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
  }
});

export default router;
