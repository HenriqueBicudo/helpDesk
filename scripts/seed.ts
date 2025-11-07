import path from 'path';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { db } from '../server/db-postgres';
import * as schema from '../shared/drizzle-schema';
import { hashPassword } from '../server/auth';

// Carregar variáveis de ambiente da raiz
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function upsertCompany(tx: any, company: any) {
  const existing = await tx.select().from(schema.companies).where(eq(schema.companies.email, company.email));
  if (existing && existing.length > 0) return existing[0];
  const res = await tx.insert(schema.companies).values(company).returning();
  return res[0];
}

async function upsertTeam(tx: any, team: any) {
  const existing = await tx.select().from(schema.teams).where(eq(schema.teams.name, team.name));
  if (existing && existing.length > 0) return existing[0];
  const res = await tx.insert(schema.teams).values(team).returning();
  return res[0];
}

async function upsertUser(tx: any, user: any) {
  const existing = await tx.select().from(schema.users).where(eq(schema.users.email, user.email));
  if (existing && existing.length > 0) return existing[0];
  const res = await tx.insert(schema.users).values(user).returning();
  return res[0];
}

async function upsertRequester(tx: any, requester: any) {
  const existing = await tx.select().from(schema.requesters).where(eq(schema.requesters.email, requester.email));
  if (existing && existing.length > 0) return existing[0];
  const res = await tx.insert(schema.requesters).values(requester).returning();
  return res[0];
}

async function upsertTicket(tx: any, ticket: any) {
  const exists = await tx.select().from(schema.tickets).where(eq(schema.tickets.subject, ticket.subject));
  if (exists && exists.length > 0) return exists[0];
  const res = await tx.insert(schema.tickets).values(ticket).returning();
  return res[0];
}

async function runSeed() {
  console.log('Iniciando seed via Drizzle...');

  await db.transaction(async (tx) => {
    // 1) Company
    const company = await upsertCompany(tx, {
      name: 'Acme Corp',
      email: 'contact@acme.example',
      isActive: true,
      hasActiveContract: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2) Team
    const team = await upsertTeam(tx, {
      name: 'Suporte Técnico',
      description: 'Equipe de suporte técnico',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3) Users
    const adminHashed = await hashPassword('admin');
    const agentHashed = await hashPassword('agent');
    const clientHashed = await hashPassword('client');

    const admin = await upsertUser(tx, {
      username: 'admin',
      password: adminHashed,
      fullName: 'Administrador',
      email: 'admin@example.com',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const agent = await upsertUser(tx, {
      username: 'agent1',
      password: agentHashed,
      fullName: 'Fulano Agente',
      email: 'agent1@example.com',
      role: 'helpdesk_agent',
      teamId: team.id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const client = await upsertUser(tx, {
      username: 'client1',
      password: clientHashed,
      fullName: 'Cliente Um',
      email: 'client1@example.com',
      role: 'client_user',
      company: company.name,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4) Requester
    const requester = await upsertRequester(tx, {
      fullName: 'Cliente Um',
      email: 'client1@example.com',
      company: company.name,
      planType: 'basic',
      monthlyHours: 10,
      usedHours: '0',
      resetDate: new Date(),
      createdAt: new Date(),
    });

    // 5) Ticket
    const ticket = await upsertTicket(tx, {
      subject: 'Problema no sistema',
      description: 'Não consigo acessar o relatório X. Aparece erro de permissão.',
      status: 'open',
      priority: 'medium',
      category: 'technical_support',
      requesterId: requester.id,
      assigneeId: agent.id,
      companyId: company.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 6) Interaction
    const interactions = await tx.select().from(schema.ticketInteractions).where(eq(schema.ticketInteractions.ticketId, ticket.id));
    if (!interactions || interactions.length === 0) {
      await tx.insert(schema.ticketInteractions).values({
        ticketId: ticket.id,
        userId: agent.id,
        type: 'comment',
        content: 'Iniciando análise do chamado',
        isInternal: false,
        createdAt: new Date(),
      });
    }

    console.log('Seed aplicada com sucesso (empresa, time, users, requester, ticket, interação)');
  });
}

runSeed()
  .then(() => {
    console.log('Concluído');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Erro ao aplicar seed:', err);
    process.exit(1);
  });
