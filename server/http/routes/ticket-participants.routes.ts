import { Request, Response, Router } from 'express';
import { db } from '../../db-postgres';
import { ticketRequesters, ticketCc, requesters, tickets, companies, users } from '../../../shared/drizzle-schema';
import { eq, and, or } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/tickets/:ticketId/requesters
 * Obter todos os solicitantes de um ticket
 */
router.get('/:ticketId/requesters', async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);

    const ticketRequestersData = await db
      .select({
        id: ticketRequesters.id,
        requesterId: ticketRequesters.requesterId,
        isPrimary: ticketRequesters.isPrimary,
        createdAt: ticketRequesters.createdAt,
        requester: requesters,
      })
      .from(ticketRequesters)
      .leftJoin(requesters, eq(ticketRequesters.requesterId, requesters.id))
      .where(eq(ticketRequesters.ticketId, ticketId));

    res.json(ticketRequestersData);
  } catch (error) {
    console.error('Error fetching ticket requesters:', error);
    res.status(500).json({ message: 'Erro ao buscar solicitantes do ticket' });
  }
});

/**
 * POST /api/tickets/:ticketId/requesters
 * Adicionar um solicitante ao ticket
 */
router.post('/:ticketId/requesters', async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const { requesterId } = req.body;

    if (!requesterId) {
      return res.status(400).json({ message: 'requesterId é obrigatório' });
    }

    // Verificar se o ticket existe e obter sua empresa
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket não encontrado' });
    }

    // Verificar se o solicitante existe na tabela requesters
    let [requester] = await db
      .select()
      .from(requesters)
      .where(eq(requesters.id, requesterId));

    // Se não existir em requesters, verificar se é um usuário e criar o requester
    if (!requester) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, requesterId));

      if (!user) {
        return res.status(404).json({ message: 'Solicitante não encontrado' });
      }

      // Validar se o usuário é do tipo cliente
      if (user.role !== 'client_manager' && user.role !== 'client_user') {
        return res.status(400).json({ message: 'Apenas clientes podem ser adicionados como solicitantes' });
      }

      // Verificar empresa do usuário
      let userCompanyName = user.company;
      
      if (ticket.companyId) {
        const [company] = await db
          .select()
          .from(companies)
          .where(eq(companies.id, ticket.companyId));

        if (!company) {
          return res.status(400).json({ message: 'Empresa do ticket não encontrada' });
        }

        // Verificar se o usuário pertence à mesma empresa (nome ou ID)
        if (user.company !== company.name && user.company !== company.id.toString()) {
          return res.status(400).json({ 
            message: 'O solicitante deve pertencer à mesma empresa do ticket' 
          });
        }
        userCompanyName = company.name;
      }

      // Criar registro na tabela requesters
      [requester] = await db
        .insert(requesters)
        .values({
          fullName: user.fullName,
          email: user.email,
          company: userCompanyName,
          avatarInitials: user.avatarInitials,
          planType: 'basic',
          monthlyHours: 10,
          usedHours: '0',
        })
        .returning();
    } else {
      // Validar se o solicitante pertence à mesma empresa do ticket
      if (ticket.companyId) {
        // Buscar nome da empresa
        const [company] = await db
          .select()
          .from(companies)
          .where(eq(companies.id, ticket.companyId));

        if (company && requester.company !== company.name) {
          return res.status(400).json({ 
            message: 'O solicitante deve pertencer à mesma empresa do ticket' 
          });
        }
      } else {
        // Fallback: comparar pelo campo company do solicitante principal
        const [mainRequester] = await db
          .select()
          .from(requesters)
          .where(eq(requesters.id, ticket.requesterId));

        if (mainRequester && mainRequester.company !== requester.company) {
          return res.status(400).json({ 
            message: 'O solicitante deve pertencer à mesma empresa do ticket' 
          });
        }
      }
    }

    // Adicionar solicitante ao ticket
    const [newRequester] = await db
      .insert(ticketRequesters)
      .values({
        ticketId,
        requesterId: requester.id,
        isPrimary: false,
      })
      .returning();

    res.status(201).json(newRequester);
  } catch (error: any) {
    console.error('Error adding requester to ticket:', error);
    
    // Verificar se é erro de duplicata
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Este solicitante já está vinculado ao ticket' });
    }
    
    res.status(500).json({ message: 'Erro ao adicionar solicitante ao ticket' });
  }
});

/**
 * DELETE /api/tickets/:ticketId/requesters/:requesterId
 * Remover um solicitante do ticket
 */
router.delete('/:ticketId/requesters/:requesterId', async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const requesterId = parseInt(req.params.requesterId);

    // Verificar se não é o solicitante principal
    const [ticketRequester] = await db
      .select()
      .from(ticketRequesters)
      .where(
        and(
          eq(ticketRequesters.ticketId, ticketId),
          eq(ticketRequesters.requesterId, requesterId)
        )
      );

    if (!ticketRequester) {
      return res.status(404).json({ message: 'Solicitante não encontrado neste ticket' });
    }

    if (ticketRequester.isPrimary) {
      return res.status(400).json({ 
        message: 'Não é possível remover o solicitante principal do ticket' 
      });
    }

    await db
      .delete(ticketRequesters)
      .where(
        and(
          eq(ticketRequesters.ticketId, ticketId),
          eq(ticketRequesters.requesterId, requesterId)
        )
      );

    res.json({ message: 'Solicitante removido com sucesso' });
  } catch (error) {
    console.error('Error removing requester from ticket:', error);
    res.status(500).json({ message: 'Erro ao remover solicitante do ticket' });
  }
});

/**
 * GET /api/tickets/:ticketId/cc
 * Obter todas as pessoas em cópia de um ticket
 */
router.get('/:ticketId/cc', async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);

    const ccList = await db
      .select()
      .from(ticketCc)
      .where(eq(ticketCc.ticketId, ticketId));

    res.json(ccList);
  } catch (error) {
    console.error('Error fetching ticket CC:', error);
    res.status(500).json({ message: 'Erro ao buscar pessoas em cópia do ticket' });
  }
});

/**
 * POST /api/tickets/:ticketId/cc
 * Adicionar pessoa em cópia ao ticket
 */
router.post('/:ticketId/cc', async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email é obrigatório' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    const [newCc] = await db
      .insert(ticketCc)
      .values({
        ticketId,
        email: email.toLowerCase(),
        name,
      })
      .returning();

    res.status(201).json(newCc);
  } catch (error: any) {
    console.error('Error adding CC to ticket:', error);
    
    // Verificar se é erro de duplicata
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Este email já está em cópia no ticket' });
    }
    
    res.status(500).json({ message: 'Erro ao adicionar pessoa em cópia ao ticket' });
  }
});

/**
 * DELETE /api/tickets/:ticketId/cc/:ccId
 * Remover pessoa em cópia do ticket
 */
router.delete('/:ticketId/cc/:ccId', async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const ccId = parseInt(req.params.ccId);

    await db
      .delete(ticketCc)
      .where(
        and(
          eq(ticketCc.id, ccId),
          eq(ticketCc.ticketId, ticketId)
        )
      );

    res.json({ message: 'Pessoa removida da cópia com sucesso' });
  } catch (error) {
    console.error('Error removing CC from ticket:', error);
    res.status(500).json({ message: 'Erro ao remover pessoa da cópia do ticket' });
  }
});

/**
 * GET /api/tickets/:ticketId/available-requesters
 * Obter solicitantes disponíveis da mesma empresa do ticket
 */
router.get('/:ticketId/available-requesters', async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);

    // Buscar ticket e empresa
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket não encontrado' });
    }

    if (!ticket.companyId) {
      // Se o ticket não tem empresa vinculada, buscar pela empresa do solicitante principal
      const [mainRequester] = await db
        .select()
        .from(requesters)
        .where(eq(requesters.id, ticket.requesterId));

      if (!mainRequester || !mainRequester.company) {
        return res.json([]);
      }

      // Buscar todos os solicitantes da mesma empresa (campo texto)
      const availableRequesters = await db
        .select()
        .from(requesters)
        .where(eq(requesters.company, mainRequester.company));

      return res.json(availableRequesters);
    }

    // Buscar nome da empresa
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, ticket.companyId));

    if (!company) {
      return res.json([]);
    }

    // Buscar todos os solicitantes/usuários da mesma empresa
    // Buscar tanto na tabela requesters quanto users
    const requestersFromCompany = await db
      .select()
      .from(requesters)
      .where(eq(requesters.company, company.name));

    // Também buscar usuários do tipo cliente da mesma empresa
    // Nota: o campo company pode ser o nome da empresa OU o ID da empresa (string)
    const usersFromCompany = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        company: users.company,
        avatarInitials: users.avatarInitials,
        planType: users.role, // placeholder
        monthlyHours: users.id, // placeholder
        usedHours: users.id, // placeholder
        resetDate: users.createdAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          or(
            eq(users.company, company.name),
            eq(users.company, company.id.toString())
          ),
          or(
            eq(users.role, 'client_manager'),
            eq(users.role, 'client_user')
          )
        )
      );

    // Combinar ambos os resultados, removendo duplicatas por email
    const allRequesters = [...requestersFromCompany];
    const existingEmails = new Set(requestersFromCompany.map(r => r.email.toLowerCase()));
    
    for (const user of usersFromCompany) {
      if (!existingEmails.has(user.email.toLowerCase())) {
        // Converter user para formato de requester
        allRequesters.push({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          company: user.company || company.name,
          avatarInitials: user.avatarInitials || null,
          planType: 'basic' as any,
          monthlyHours: 10,
          usedHours: '0',
          resetDate: user.resetDate,
          createdAt: user.createdAt,
        });
      }
    }

    res.json(allRequesters);
  } catch (error) {
    console.error('Error fetching available requesters:', error);
    res.status(500).json({ message: 'Erro ao buscar solicitantes disponíveis' });
  }
});

export default router;
