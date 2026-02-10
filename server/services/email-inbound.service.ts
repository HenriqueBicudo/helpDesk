import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { db } from '../db-postgres';
import { tickets, ticketInteractions, users, requesters, companies } from '@shared/drizzle-schema';
import { eq } from 'drizzle-orm';

export class EmailInboundService {
  private imap: Imap | null = null;
  private isMonitoring = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeImap();
  }

  /**
   * Inicializar conexão IMAP se configurado
   */
  private initializeImap(): void {
    const imapHost = process.env.IMAP_HOST;
    const imapPort = process.env.IMAP_PORT;
    const imapUser = process.env.IMAP_USER;
    const imapPass = process.env.IMAP_PASS;

    if (!imapHost || !imapUser || !imapPass) {
      console.log('ℹ️  IMAP não configurado - recebimento de emails desabilitado');
      console.log('   Configure IMAP_HOST, IMAP_USER, IMAP_PASS no .env para ativar');
      return;
    }

    try {
      this.imap = new Imap({
        user: imapUser,
        password: imapPass.replace(/\s/g, ''), // Remove espaços da senha
        host: imapHost,
        port: parseInt(imapPort || '993'),
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
        connTimeout: 10000
      });

      console.log(`✅ IMAP configurado: ${imapHost}:${imapPort || 993} (${imapUser})`);
    } catch (error) {
      console.error('❌ Erro ao configurar IMAP:', error);
      this.imap = null;
    }
  }

  /**
   * Extrair ticket ID do subject ou headers
   */
  private extractTicketId(subject: string, inReplyTo?: string, references?: string): number | null {
    // Tentar extrair do subject: "Re: [Ticket #123]"
    const subjectMatch = subject?.match(/\[Ticket #(\d+)\]/i) || subject?.match(/Ticket #(\d+)/i);
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
  private cleanEmailContent(html?: string, text?: string): string {
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
        // Se encontrar uma linha que começa com "On" ou "Em", pode ser início de citação
        if (line.match(/^(On|Em) .+wrote:/i)) {
          break;
        }
        if (!inQuote) {
          cleanLines.push(line);
        }
      }
      
      content = cleanLines.join('\n').trim();
    }

    // Remover assinaturas comuns no HTML
    if (html) {
      // Remover tudo depois de <div class="gmail_quote"> ou similar
      const gmailQuoteMatch = content.match(/<div[^>]*class="gmail_quote"[^>]*>/i);
      if (gmailQuoteMatch && gmailQuoteMatch.index) {
        content = content.substring(0, gmailQuoteMatch.index);
      }

      // Remover blockquotes (citações)
      content = content.replace(/<blockquote[^>]*>.*?<\/blockquote>/gis, '');
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
   * Criar novo ticket a partir de email
   */
  private async createTicketFromEmail(mail: ParsedMail): Promise<void> {
    try {
      const subject = mail.subject || 'Sem assunto';
      const from = mail.from?.value?.[0]?.address || '';
      const fromName = mail.from?.value?.[0]?.name || from;

      console.log('📬 Criando novo ticket via email:', {
        from,
        fromName,
        subject
      });

      // Limpar e preparar conteúdo
      const htmlContent = mail.html ? mail.html.toString() : undefined;
      const textContent = mail.text ? mail.text.toString() : undefined;
      const content = this.cleanEmailContent(htmlContent, textContent);

      if (!content || content.length < 5) {
        console.log('⚠️  Conteúdo do email vazio ou muito curto - ticket não criado');
        return;
      }

      // Buscar usuário pelo email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, from));

      // Gerar Message-ID inicial para a thread de email
      const domain = process.env.SMTP_FROM_EMAIL?.split('@')[1] || 'helpdesk.local';
      const emailThreadId = `<ticket-${Date.now()}@${domain}>`;

      if (user) {
        // Usuário cadastrado - criar ticket direto
        console.log(`✅ Usuário encontrado: ${user.fullName} (${user.email})`);
        console.log(`   📋 Dados do usuário: company="${user.company}", role=${user.role}`);

        // Buscar empresa - aceita tanto ID quanto nome
        let companyId: number | null = null;
        if (user.company) {
          const companyValue = user.company.trim();
          
          // Verificar se é um ID (número) ou nome
          if (/^\d+$/.test(companyValue)) {
            // É um ID numérico
            companyId = parseInt(companyValue);
            console.log(`🔍 Usando company ID direto: ${companyId}`);
            
            // Verificar se a empresa existe
            const [company] = await db
              .select()
              .from(companies)
              .where(eq(companies.id, companyId));
            
            if (company) {
              console.log(`✅ 🏢 Empresa vinculada ao ticket: ${company.name} (ID: ${companyId})`);
            } else {
              console.log(`⚠️  Empresa ID ${companyId} não encontrada - ticket será criado sem empresa`);
              companyId = null;
            }
          } else {
            // É um nome - buscar pelo nome
            console.log(`🔍 Buscando empresa com nome: "${companyValue}"`);
            
            const [company] = await db
              .select()
              .from(companies)
              .where(eq(companies.name, companyValue));
            
            if (company) {
              companyId = company.id;
              console.log(`✅ 🏢 Empresa vinculada ao ticket: ${company.name} (ID: ${companyId})`);
            } else {
              console.log(`❌ Empresa "${companyValue}" não encontrada no cadastro de empresas`);
            }
          }
        } else {
          console.log(`⚠️  Usuário não tem empresa cadastrada (campo company está vazio)`);
        }

        // Buscar ou criar requester
        let [requester] = await db
          .select()
          .from(requesters)
          .where(eq(requesters.email, from));

        if (!requester) {
          [requester] = await db
            .insert(requesters)
            .values({
              fullName: user.fullName,
              email: user.email,
              company: user.company || null,
              createdAt: new Date()
            })
            .returning();
        }

        // Criar ticket
        const [ticket] = await db
          .insert(tickets)
          .values({
            subject,
            description: content,
            status: 'open',
            priority: 'medium',
            category: 'other',
            requesterId: requester.id,
            companyId: companyId,
            emailThreadId,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        console.log(`✅ Ticket #${ticket.id} criado via email de ${from}`);
        console.log(`   🏢 CompanyId do ticket: ${ticket.companyId || 'null (sem empresa)'}`);
        console.log(`   📧 EmailThreadId: ${ticket.emailThreadId}`);
      } else {
        // Usuário NÃO cadastrado - criar ticket sem empresa (consultor vai vincular depois)
        console.log(`⚠️  Usuário não cadastrado: ${from}`);

        // Criar requester temporário
        const [requester] = await db
          .insert(requesters)
          .values({
            fullName: fromName,
            email: from,
            company: null, // Sem empresa - consultor vai vincular
            createdAt: new Date()
          })
          .returning();

        // Criar ticket com aviso
        const ticketDescription = `
<div style="background: #fff3cd; padding: 10px; border-left: 3px solid #ffc107; margin-bottom: 15px;">
  <strong>⚠️ Atenção:</strong> Este ticket foi criado via email de um remetente não cadastrado.<br>
  <strong>Email:</strong> ${from}<br>
  <strong>Nome:</strong> ${fromName}<br>
  <strong>Ação necessária:</strong> Vincular o ticket a uma empresa antes de prosseguir.
</div>

${content}
        `.trim();

        const [ticket] = await db
          .insert(tickets)
          .values({
            subject: `[Email Externo] ${subject}`,
            description: ticketDescription,
            status: 'open',
            priority: 'medium',
            category: 'other',
            requesterId: requester.id,
            companyId: null, // SEM EMPRESA - precisa ser vinculado
            emailThreadId,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        console.log(`✅ Ticket #${ticket.id} criado (sem empresa) via email de ${from}`);
      }
    } catch (error) {
      console.error('❌ Erro ao criar ticket via email:', error);
    }
  }

  /**
   * Processar um email recebido
   */
  private async processEmail(mail: ParsedMail): Promise<void> {
    try {
      const subject = mail.subject || '';
      const from = mail.from?.value?.[0]?.address || '';
      const inReplyTo = mail.inReplyTo || '';
      
      // Corrigir references - pode ser string ou array
      let references = '';
      if (mail.references) {
        if (Array.isArray(mail.references)) {
          references = mail.references.join(' ');
        } else if (typeof mail.references === 'string') {
          references = mail.references;
        }
      }

      console.log('📨 Processando email:', {
        from,
        subject,
        hasHtml: !!mail.html,
        hasText: !!mail.text
      });

      // Extrair ticket ID
      const ticketId = this.extractTicketId(subject, inReplyTo, references);

      if (!ticketId) {
        // Não é resposta a um ticket existente - criar novo ticket
        console.log('📝 Email não é resposta a ticket - criando novo ticket');
        await this.createTicketFromEmail(mail);
        return;
      }

      // Verificar se o ticket existe
      const [ticket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketId));

      if (!ticket) {
        console.log(`⚠️  Ticket #${ticketId} não encontrado`);
        return;
      }

      // Limpar e preparar conteúdo
      const htmlContent = mail.html ? mail.html.toString() : undefined;
      const textContent = mail.text ? mail.text.toString() : undefined;
      const content = this.cleanEmailContent(htmlContent, textContent);

      if (!content || content.length < 5) {
        console.log('⚠️  Conteúdo do email vazio ou muito curto');
        return;
      }

      // Buscar usuário pelo email
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, from));

      // Se não encontrar usuário, usar ID 1 (sistema) e adicionar info do remetente
      let finalContent = content;
      const userId = user?.id || 1;

      if (!user) {
        finalContent = `<p><em>Resposta via email de: ${from}</em></p>\n${content}`;
      }

      // Criar interação no ticket
      const [interaction] = await db
        .insert(ticketInteractions)
        .values({
          ticketId,
          type: 'comment',
          content: finalContent,
          isInternal: false,
          timeSpent: '0',
          userId,
          createdAt: new Date(),
        })
        .returning();

      console.log(`✅ Interação criada no ticket #${ticketId} via email de ${from}`);
    } catch (error) {
      console.error('❌ Erro ao processar email:', error);
    }
  }

  /**
   * Buscar e processar novos emails
   */
  private async checkNewEmails(): Promise<void> {
    if (!this.imap || this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    return new Promise((resolve, reject) => {
      this.imap!.once('ready', () => {
        this.imap!.openBox('INBOX', false, (err, box) => {
          if (err) {
            console.error('❌ Erro ao abrir caixa de entrada:', err);
            this.isMonitoring = false;
            reject(err);
            return;
          }

          // Buscar emails não lidos
          this.imap!.search(['UNSEEN'], (err, results) => {
            if (err) {
              console.error('❌ Erro ao buscar emails:', err);
              this.imap!.end();
              this.isMonitoring = false;
              reject(err);
              return;
            }

            if (!results || results.length === 0) {
              console.log('ℹ️  Nenhum email novo encontrado');
              this.imap!.end();
              this.isMonitoring = false;
              resolve();
              return;
            }

            console.log(`📬 ${results.length} email(s) novo(s) encontrado(s)`);

            const fetch = this.imap!.fetch(results, {
              bodies: '',
              markSeen: true
            });

            const emailPromises: Promise<void>[] = [];

            fetch.on('message', (msg) => {
              const emailPromise = new Promise<void>((resolveEmail) => {
                msg.on('body', (stream) => {
                  simpleParser(stream, async (err, parsed) => {
                    if (err) {
                      console.error('❌ Erro ao fazer parse do email:', err);
                      resolveEmail();
                      return;
                    }

                    await this.processEmail(parsed);
                    resolveEmail();
                  });
                });
              });

              emailPromises.push(emailPromise);
            });

            fetch.once('error', (err) => {
              console.error('❌ Erro no fetch:', err);
              reject(err);
            });

            fetch.once('end', async () => {
              // Aguardar processamento de todos os emails
              await Promise.all(emailPromises);
              
              this.imap!.end();
              this.isMonitoring = false;
              resolve();
            });
          });
        });
      });

      this.imap!.once('error', (err) => {
        console.error('❌ Erro na conexão IMAP:', err);
        this.isMonitoring = false;
        reject(err);
      });

      this.imap!.connect();
    });
  }

  /**
   * Iniciar monitoramento periódico de emails
   */
  public startMonitoring(intervalMinutes: number = 1): void {
    if (!this.imap) {
      console.log('ℹ️  IMAP não configurado - monitoramento de emails não iniciado');
      return;
    }

    if (this.checkInterval) {
      console.log('ℹ️  Monitoramento de emails já está ativo');
      return;
    }

    console.log(`📬 Iniciando monitoramento de emails (verificação a cada ${intervalMinutes} minuto(s))`);

    // Verificar imediatamente
    this.checkNewEmails().catch(err => {
      console.error('Erro na verificação inicial de emails:', err);
    });

    // Configurar verificação periódica
    this.checkInterval = setInterval(() => {
      this.checkNewEmails().catch(err => {
        console.error('Erro na verificação periódica de emails:', err);
      });
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Parar monitoramento de emails
   */
  public stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('📭 Monitoramento de emails parado');
    }
  }
}

// Singleton instance
export const emailInboundService = new EmailInboundService();
