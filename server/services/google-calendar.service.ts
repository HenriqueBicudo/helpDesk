import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';

/**
 * Serviço para integração com Google Calendar API
 * 
 * CONFIGURAÇÃO NECESSÁRIA:
 * 1. Criar projeto no Google Cloud Console: https://console.cloud.google.com
 * 2. Ativar Google Calendar API
 * 3. Criar credenciais OAuth 2.0
 * 4. Adicionar variáveis de ambiente no .env:
 *    - GOOGLE_CLIENT_ID
 *    - GOOGLE_CLIENT_SECRET
 *    - GOOGLE_REDIRECT_URI (ex: http://localhost:5000/api/google/callback)
 *    - GOOGLE_REFRESH_TOKEN (obter após primeira autenticação)
 */

class GoogleCalendarService {
  private calendar: calendar_v3.Calendar | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/callback';
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      console.warn('⚠️ Google Calendar API não configurada. Configure as variáveis de ambiente:');
      console.warn('   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN');
      return;
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      console.log('✅ Google Calendar API inicializada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar Google Calendar API:', error);
    }
  }

  /**
   * Cria um evento no Google Calendar com Google Meet
   */
  async createMeetingEvent(params: {
    summary: string;
    description: string;
    startDateTime: string; // ISO 8601 format
    durationMinutes: number;
    attendees: Array<{ email: string; displayName?: string }>;
    timezone?: string;
  }) {
    if (!this.calendar) {
      throw new Error('Google Calendar API não está configurada. Verifique as variáveis de ambiente.');
    }

    try {
      // Calcular data/hora de término
      const startDate = new Date(params.startDateTime);
      const endDate = new Date(startDate.getTime() + params.durationMinutes * 60000);

      const event: calendar_v3.Schema$Event = {
        summary: params.summary,
        description: params.description,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: params.timezone || 'America/Sao_Paulo',
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: params.timezone || 'America/Sao_Paulo',
        },
        attendees: params.attendees.map(a => ({
          email: a.email,
          displayName: a.displayName,
        })),
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 }, // 1 hora antes
            { method: 'popup', minutes: 10 },  // 10 minutos antes
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all', // Envia convites para todos os participantes
      });

      const meetLink = response.data.conferenceData?.entryPoints?.find(
        ep => ep.entryPointType === 'video'
      )?.uri;

      return {
        eventId: response.data.id,
        meetLink: meetLink || null,
        htmlLink: response.data.htmlLink,
        status: response.data.status,
        created: response.data.created,
      };
    } catch (error: any) {
      console.error('Erro ao criar evento no Google Calendar:', error);
      
      // Mensagens de erro mais claras
      if (error.code === 401) {
        throw new Error('Token do Google expirado. Execute o fluxo de autenticação novamente.');
      } else if (error.code === 403) {
        throw new Error('Sem permissão para acessar Google Calendar API. Verifique os escopos OAuth.');
      } else if (error.code === 404) {
        throw new Error('Calendário não encontrado.');
      }
      
      throw new Error(`Erro ao criar reunião: ${error.message}`);
    }
  }

  /**
   * Gera URL de autenticação OAuth2 (usar para obter o primeiro refresh_token)
   */
  getAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/callback';

    if (!clientId || !clientSecret) {
      throw new Error('Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET');
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Força geração de refresh_token
    });
  }

  /**
   * Troca o código de autorização por tokens (usar após callback OAuth)
   */
  async getTokensFromCode(code: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/callback';

    if (!clientId || !clientSecret) {
      throw new Error('Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET');
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Verifica se a API está configurada
   */
  isConfigured(): boolean {
    return this.calendar !== null;
  }
}

// Exportar instância singleton
export const googleCalendarService = new GoogleCalendarService();
