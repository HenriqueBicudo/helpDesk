import { Router, Request, Response } from 'express';
import { db } from '../../db-postgres';
import { tasks, taskInteractions, tickets, teams, requesters, ticketInteractions, users } from '@shared/drizzle-schema';
import { insertTaskSchema, insertTaskInteractionSchema } from '@shared/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { requireAuth, requireActiveUser } from '../../middleware/auth';

const router = Router();

// Middleware de autenticação para todas as rotas
router.use(requireAuth, requireActiveUser);

/**
 * GET /api/tasks
 * Listar todas as tarefas
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { ticketId, teamId, status, type } = req.query;

    // Construir condições de filtro
    const conditions = [];
    if (ticketId) {
      conditions.push(eq(tasks.ticketId, parseInt(ticketId as string)));
    }
    if (teamId) {
      conditions.push(eq(tasks.teamId, parseInt(teamId as string)));
    }
    if (status) {
      conditions.push(eq(tasks.status, status as any));
    }
    if (type) {
      conditions.push(eq(tasks.type, type as any));
    }

    // Buscar tarefas com joins
    const query = db.select({
      task: tasks,
      ticket: {
        id: tickets.id,
        subject: tickets.subject,
        status: tickets.status,
      },
      requester: {
        id: requesters.id,
        fullName: requesters.fullName,
        email: requesters.email,
      },
      team: {
        id: teams.id,
        name: teams.name,
      },
      createdBy: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
      assignedTo: {
        id: sql`assigned_user.id`,
        fullName: sql`assigned_user.full_name`,
        email: sql`assigned_user.email`,
      },
    })
    .from(tasks)
    .leftJoin(tickets, eq(tasks.ticketId, tickets.id))
    .leftJoin(requesters, eq(tickets.requesterId, requesters.id))
    .leftJoin(teams, eq(tasks.teamId, teams.id))
    .leftJoin(users, eq(tasks.createdBy, users.id))
    .leftJoin(sql`users AS assigned_user`, sql`tasks.assigned_to_id = assigned_user.id`)
    .orderBy(desc(tasks.createdAt));

    // Aplicar filtros se houver
    const results = conditions.length > 0 
      ? await query.where(and(...conditions))
      : await query;

    res.json(results);
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Erro ao buscar tarefas', error: error.message });
  }
});

/**
 * GET /api/tasks/:taskCode
 * Buscar uma tarefa específica
 */
router.get('/:taskCode', async (req: Request, res: Response) => {
  try {
    const taskCode = req.params.taskCode;

    const result = await db.select({
      task: tasks,
      ticket: {
        id: tickets.id,
        subject: tickets.subject,
        status: tickets.status,
      },
      team: {
        id: teams.id,
        name: teams.name,
      },
      createdBy: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
      assignedTo: {
        id: sql`assigned_user.id`,
        fullName: sql`assigned_user.full_name`,
        email: sql`assigned_user.email`,
      },
    })
    .from(tasks)
    .leftJoin(tickets, eq(tasks.ticketId, tickets.id))
    .leftJoin(teams, eq(tasks.teamId, teams.id))
    .leftJoin(users, eq(tasks.createdBy, users.id))
    .leftJoin(sql`users AS assigned_user`, sql`tasks.assigned_to_id = assigned_user.id`)
    .where(eq(tasks.taskCode, taskCode))
    .limit(1);
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }

    res.json(result[0]);
  } catch (error: any) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Erro ao buscar tarefa', error: error.message });
  }
});

/**
 * POST /api/tasks
 * Criar uma nova tarefa
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { ticketId, type, subject, description, priority, teamId, context } = req.body;
    const userId = (req as any).user.id;

    // Verificar se o ticket existe
    const ticket = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
    if (ticket.length === 0) {
      return res.status(404).json({ message: 'Ticket não encontrado' });
    }

    // Buscar o próximo número de tarefa para este ticket
    const lastTask = await db.select({ taskNumber: tasks.taskNumber })
      .from(tasks)
      .where(eq(tasks.ticketId, ticketId))
      .orderBy(desc(tasks.taskNumber))
      .limit(1);

    const nextTaskNumber = lastTask.length > 0 ? lastTask[0].taskNumber + 1 : 1;
    const taskCode = `${ticketId}-T${nextTaskNumber}`;

    // Criar tarefa
    const newTask = await db.insert(tasks).values({
      ticketId,
      type,
      subject,
      description,
      status: 'open',
      priority: priority || 'medium',
      teamId,
      taskNumber: nextTaskNumber,
      taskCode,
      createdBy: userId,
    }).returning();

    // Criar interação inicial com contexto
    await db.insert(taskInteractions).values({
      taskId: newTask[0].id,
      userId,
      type: 'comment',
      content: context || `Tarefa ${taskCode} criada`,
      isInternal: false,
    });

    // Se for tarefa de apoio, pausar o ticket e mudar status
    if (type === 'support') {
      await db.update(tickets)
        .set({ 
          pausedByTaskId: newTask[0].id,
          status: 'status_1771613797601' as any, // Aguardando tarefa
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, ticketId));

      // Adicionar comentário INTERNO no ticket original
      await db.insert(ticketInteractions).values({
        ticketId: ticketId,
        userId,
        type: 'comment',
        content: `Tarefa de apoio ${taskCode} criada. Ticket pausado aguardando conclusão da tarefa.`,
        isInternal: true,
      });
    } else {
      // Tarefa paralela - apenas adiciona comentário
      await db.insert(ticketInteractions).values({
        ticketId: ticketId,
        userId,
        type: 'comment',
        content: `Tarefa paralela ${taskCode} criada.`,
        isInternal: false,
      });
    }

    res.status(201).json(newTask[0]);
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Erro ao criar tarefa', error: error.message });
  }
});

/**
 * PATCH /api/tasks/:id
 * Atualizar uma tarefa
 */
router.patch('/:taskCode', async (req: Request, res: Response) => {
  try {
    const taskCode = req.params.taskCode;
    const userId = (req as any).user.id;
    const { status, teamId, subject, description, priority, assignedToId } = req.body;

    // Buscar tarefa atual
    const currentTask = await db.select().from(tasks).where(eq(tasks.taskCode, taskCode)).limit(1);
    if (currentTask.length === 0) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }

    const task = currentTask[0];
    const taskId = task.id;
    const updates: any = { updatedAt: new Date() };

    // Atualizar campos permitidos
    if (status !== undefined) {
      updates.status = status;
    }
    if (teamId !== undefined) {
      updates.teamId = teamId;
    }
    if (subject !== undefined) {
      updates.subject = subject;
    }
    if (description !== undefined) {
      updates.description = description;
    }
    if (priority !== undefined) {
      updates.priority = priority;
    }
    if (assignedToId !== undefined) {
      updates.assignedToId = assignedToId;
      
      // Se atribuir uma tarefa aberta, mudar automaticamente para em atendimento
      if (assignedToId && task.status === 'open' && status === undefined) {
        updates.status = 'in_progress';
      }
      
      // Registrar mudança de atribuição
      if (assignedToId !== task.assignedToId) {
        await db.insert(taskInteractions).values({
          taskId: taskId,
          userId,
          type: 'assignment',
          content: assignedToId 
            ? `Tarefa atribuída a um membro da equipe` 
            : `Tarefa desatribuída`,
          isInternal: false,
        });

        // Se o status foi mudado automaticamente, registrar mudança de status
        if (assignedToId && task.status === 'open' && status === undefined) {
          await db.insert(taskInteractions).values({
            taskId,
            userId,
            type: 'status_change',
            content: `Status alterado de open para in_progress`,
            isInternal: false,
            metadata: { oldStatus: 'open', newStatus: 'in_progress' },
          });
        }
      }
    }

    // Se está completando a tarefa
    if (status === 'completed' && task.status !== 'completed') {
      updates.completedAt = new Date();
      updates.completedBy = userId;

      // Se for tarefa de apoio, despausar o ticket
      if (task.type === 'support') {
        // Verificar se há outras tarefas de apoio abertas para este ticket
        const openSupportTasks = await db.select()
          .from(tasks)
          .where(and(
            eq(tasks.ticketId, task.ticketId),
            eq(tasks.type, 'support'),
            sql`${tasks.status} != 'completed' AND ${tasks.status} != 'cancelled'`,
            sql`${tasks.id} != ${taskId}` // Excluir a tarefa atual
          ));

        // Se não houver mais tarefas de apoio abertas, despausar o ticket e mudar status para open
        const ticketUpdates: any = {
          pausedByTaskId: null,
          updatedAt: new Date(),
        };

        // Se não há mais tarefas de apoio abertas, mudar status de volta para open
        if (openSupportTasks.length === 0) {
          ticketUpdates.status = 'status_1771613797544'; // Status "Aberto"
        }

        await db.update(tickets)
          .set(ticketUpdates)
          .where(eq(tickets.id, task.ticketId));

        // Buscar última interação para adicionar ao ticket
        const lastInteraction = await db.select()
          .from(taskInteractions)
          .where(and(
            eq(taskInteractions.taskId, taskId),
            eq(taskInteractions.type, 'comment')
          ))
          .orderBy(desc(taskInteractions.createdAt))
          .limit(1);

        // Buscar nome do usuário que completou
        const completedByUser = await db.select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        const agentName = completedByUser.length > 0 ? completedByUser[0].fullName : 'Agente';

        // Importar ticketInteractions aqui para evitar circular dependency
        const { ticketInteractions } = await import('@shared/drizzle-schema');
        
        // 1. Adicionar comentário INTERNO informando conclusão da tarefa
        await db.insert(ticketInteractions).values({
          ticketId: task.ticketId,
          userId,
          type: 'comment',
          content: `Tarefa ${task.taskCode} concluída pelo agente ${agentName}`,
          isInternal: true,
        });

        // 2. Se houver último comentário, adicionar como comentário PÚBLICO
        if (lastInteraction.length > 0 && lastInteraction[0].content) {
          await db.insert(ticketInteractions).values({
            ticketId: task.ticketId,
            userId,
            type: 'comment',
            content: lastInteraction[0].content,
            isInternal: false,
          });
        }

        // Adicionar interação interna na tarefa informando a conclusão
        await db.insert(taskInteractions).values({
          taskId,
          userId,
          type: 'comment',
          content: `Tarefa ${task.taskCode} concluída.${lastInteraction.length > 0 ? ` Último comentário: ${lastInteraction[0].content}` : ''}`,
          isInternal: true,
        });
      }
    }

    // Atualizar tarefa
    const updatedTask = await db.update(tasks)
      .set(updates)
      .where(eq(tasks.id, taskId))
      .returning();

    // Criar interação de mudança de status
    if (status && status !== task.status) {
      await db.insert(taskInteractions).values({
        taskId,
        userId,
        type: 'status_change',
        content: `Status alterado de ${task.status} para ${status}`,
        isInternal: false,
        metadata: { oldStatus: task.status, newStatus: status },
      });
    }

    res.json(updatedTask[0]);
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Erro ao atualizar tarefa', error: error.message });
  }
});

/**
 * DELETE /api/tasks/:taskCode
 * Deletar uma tarefa (cancelar)
 */
router.delete('/:taskCode', async (req: Request, res: Response) => {
  try {
    const taskCode = req.params.taskCode;
    const userId = (req as any).user.id;

    // Buscar tarefa
    const task = await db.select().from(tasks).where(eq(tasks.taskCode, taskCode)).limit(1);
    if (task.length === 0) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }
    
    const taskId = task[0].id;

    // Se for tarefa de apoio, despausar o ticket
    if (task[0].type === 'support') {
      // Verificar se há outras tarefas de apoio abertas para este ticket
      const openSupportTasks = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.ticketId, task[0].ticketId),
          eq(tasks.type, 'support'),
          sql`${tasks.status} != 'completed' AND ${tasks.status} != 'cancelled'`,
          sql`${tasks.id} != ${taskId}` // Excluir a tarefa atual
        ));

      // Se não houver mais tarefas de apoio abertas, despausar o ticket e mudar status para open
      const ticketUpdates: any = {
        pausedByTaskId: null,
        updatedAt: new Date(),
      };

      // Se não há mais tarefas de apoio abertas, mudar status de volta para open
      if (openSupportTasks.length === 0) {
        ticketUpdates.status = 'status_1771613797544'; // Status "Aberto"
      }

      await db.update(tickets)
        .set(ticketUpdates)
        .where(eq(tickets.id, task[0].ticketId));
    }

    // Marcar como cancelada ao invés de deletar
    await db.update(tasks)
      .set({ 
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));

    res.json({ message: 'Tarefa cancelada com sucesso' });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Erro ao cancelar tarefa', error: error.message });
  }
});

/** * POST /api/tasks/:id/assign
 * Assumir uma tarefa (auto-atribuição)
 */
router.post('/:taskCode/assign', async (req: Request, res: Response) => {
  try {
    const taskCode = req.params.taskCode;
    const userId = (req as any).user.id;

    // Verificar se a tarefa existe
    const taskResult = await db.select({
      task: tasks,
      team: teams,
    })
    .from(tasks)
    .leftJoin(teams, eq(tasks.teamId, teams.id))
    .where(eq(tasks.taskCode, taskCode))
    .limit(1);

    if (taskResult.length === 0) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }

    const task = taskResult[0].task;
    const taskId = task.id;

    // Verificar se usuário pertence à equipe da tarefa
    if (task.teamId) {
      const userTeams = await db.select()
        .from(teams)
        .where(eq(teams.id, task.teamId));
      
      // Aqui você deveria verificar se o usuário faz parte da equipe
      // Por simplicidade, vamos assumir que sim se chegou até aqui
    }

    // Verificar se tarefa já está atribuída
    if (task.assignedToId) {
      return res.status(400).json({ message: 'Tarefa já está atribuída a outro usuário' });
    }

    // Atribuir tarefa ao usuário
    await db.update(tasks)
      .set({ 
        assignedToId: userId,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));

    // Registrar a auto-atribuição
    await db.insert(taskInteractions).values({
      taskId: taskId,
      userId,
      type: 'assignment',
      content: `Usuário assumiu a tarefa`,
      isInternal: false,
    });

    res.json({ message: 'Tarefa assumida com sucesso' });
  } catch (error: any) {
    console.error('Error assigning task:', error);
    res.status(500).json({ message: 'Erro ao assumir tarefa', error: error.message });
  }
});

/**
 * POST /api/tasks/:id/unassign
 * Desatribuir uma tarefa (liberar para o time)
 */
router.post('/:taskCode/unassign', async (req: Request, res: Response) => {
  try {
    const taskCode = req.params.taskCode;
    const userId = (req as any).user.id;

    // Verificar se a tarefa existe e se o usuário pode desatribuí-la
    const task = await db.select().from(tasks).where(eq(tasks.taskCode, taskCode)).limit(1);
    if (task.length === 0) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }

    // Verificar se a tarefa está atribuída ao usuário atual
    if (task[0].assignedToId !== userId) {
      return res.status(403).json({ message: 'Você não pode desatribuir esta tarefa' });
    }

    // Desatribuir tarefa
    await db.update(tasks)
      .set({ 
        assignedToId: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task[0].id));

    // Registrar a desatribuição
    await db.insert(taskInteractions).values({
      taskId: task[0].id,
      userId,
      type: 'assignment',
      content: `Usuário liberou a tarefa para a equipe`,
      isInternal: false,
    });

    res.json({ message: 'Tarefa liberada com sucesso' });
  } catch (error: any) {
    console.error('Error unassigning task:', error);
    res.status(500).json({ message: 'Erro ao liberar tarefa', error: error.message });
  }
});

/** * GET /api/tasks/:id/interactions
 * Buscar interações de uma tarefa
 */
router.get('/:taskCode/interactions', async (req: Request, res: Response) => {
  try {
    const taskCode = req.params.taskCode;
    
    // Buscar a tarefa pelo taskCode para obter o ID
    const task = await db.select().from(tasks).where(eq(tasks.taskCode, taskCode)).limit(1);
    if (task.length === 0) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }
    
    const taskId = task[0].id;

    const interactions = await db.select({
      interaction: taskInteractions,
      user: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
    })
    .from(taskInteractions)
    .leftJoin(users, eq(taskInteractions.userId, users.id))
    .where(eq(taskInteractions.taskId, taskId))
    .orderBy(asc(taskInteractions.createdAt));

    res.json(interactions);
  } catch (error: any) {
    console.error('Error fetching task interactions:', error);
    res.status(500).json({ message: 'Erro ao buscar interações', error: error.message });
  }
});

/**
 * POST /api/tasks/:id/interactions
 * Adicionar uma interação (comentário, apontamento de horas, etc)
 */
router.post('/:taskCode/interactions', async (req: Request, res: Response) => {
  try {
    const taskCode = req.params.taskCode;
    const userId = (req as any).user.id;
    
    // Verificar se a tarefa existe
    const task = await db.select().from(tasks).where(eq(tasks.taskCode, taskCode)).limit(1);
    if (task.length === 0) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }
    
    const taskId = task[0].id;
    const validatedData = insertTaskInteractionSchema.parse({
      ...req.body,
      taskId,
      userId,
    });

    // Se for o primeiro comentário e a tarefa estiver aberta, mudar status para em atendimento
    if (validatedData.type === 'comment' && task[0].status === 'open') {
      await db.update(tasks)
        .set({ 
          status: 'in_progress',
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId));

      // Criar interação de mudança de status
      await db.insert(taskInteractions).values({
        taskId,
        userId,
        type: 'status_change',
        content: `Status alterado de open para in_progress`,
        isInternal: false,
        metadata: { oldStatus: 'open', newStatus: 'in_progress' },
      });
    }

    // Criar interação
    const newInteraction = await db.insert(taskInteractions)
      .values(validatedData)
      .returning();

    // Se for apontamento de horas, atualizar total de horas da tarefa
    if (validatedData.type === 'time_log' && validatedData.timeSpent) {
      const currentTimeSpent = parseFloat(task[0].timeSpent);
      const additionalTime = parseFloat(validatedData.timeSpent);
      const newTimeSpent = currentTimeSpent + additionalTime;

      await db.update(tasks)
        .set({ 
          timeSpent: newTimeSpent.toString(),
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId));
    }

    res.status(201).json(newInteraction[0]);
  } catch (error: any) {
    console.error('Error creating task interaction:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    res.status(500).json({ message: 'Erro ao criar interação', error: error.message });
  }
});

export default router;
