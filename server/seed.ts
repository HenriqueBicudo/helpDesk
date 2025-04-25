import { db } from './db';
import { users, requesters, tickets } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Seeding database...');
  
  try {
    // Verificar se já existem dados
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log('Database already has data. Skipping seed.');
      return;
    }

    // Adicionar usuários
    const usersList = [
      { username: 'jsilva', password: 'password123', fullName: 'João Silva', email: 'joao@example.com', role: 'agent', avatarInitials: 'JS' },
      { username: 'moliveira', password: 'password123', fullName: 'Maria Oliveira', email: 'maria@example.com', role: 'agent', avatarInitials: 'MO' },
      { username: 'psantos', password: 'password123', fullName: 'Pedro Santos', email: 'pedro@example.com', role: 'agent', avatarInitials: 'PS' },
      { username: 'asilva', password: 'password123', fullName: 'Ana Silva', email: 'ana@example.com', role: 'admin', avatarInitials: 'AS' }
    ];
    
    const createdUsers = await db.insert(users).values(usersList).returning();
    console.log(`✅ Added ${createdUsers.length} users`);
    
    // Adicionar solicitantes
    const requestersList = [
      { fullName: 'Marcos Santos', email: 'marcos@example.com', company: 'ABC Corp', avatarInitials: 'MS' },
      { fullName: 'Carlos Almeida', email: 'carlos@example.com', company: 'XYZ Corp', avatarInitials: 'CA' },
      { fullName: 'Julia Ferreira', email: 'julia@example.com', company: 'ABC Corp', avatarInitials: 'JF' },
      { fullName: 'Ricardo Lima', email: 'ricardo@example.com', company: '123 Corp', avatarInitials: 'RL' },
      { fullName: 'André Silva', email: 'andre@example.com', company: 'XYZ Corp', avatarInitials: 'AS' }
    ];
    
    const createdRequesters = await db.insert(requesters).values(requestersList).returning();
    console.log(`✅ Added ${createdRequesters.length} requesters`);
    
    // Adicionar tickets
    const now = new Date();
    const ticketsList = [
      { 
        subject: 'Problema com login no sistema', 
        description: 'Não consigo acessar o sistema desde ontem.', 
        status: 'in_progress', 
        priority: 'high', 
        category: 'technical_support',
        requesterId: 1,
        assigneeId: 1,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
        updatedAt: new Date()
      },
      {
        subject: 'Solicitação de novo equipamento',
        description: 'Preciso de um novo monitor para trabalho.',
        status: 'resolved',
        priority: 'medium',
        category: 'technical_support',
        requesterId: 2,
        assigneeId: 2,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3),
        updatedAt: new Date()
      },
      {
        subject: 'Erro ao gerar relatório financeiro',
        description: 'O sistema apresenta erro ao tentar gerar relatórios.',
        status: 'pending',
        priority: 'critical',
        category: 'financial',
        requesterId: 3,
        assigneeId: 3,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 4),
        updatedAt: new Date()
      },
      {
        subject: 'Dúvida sobre uso da plataforma',
        description: 'Preciso de ajuda para configurar meu perfil.',
        status: 'resolved',
        priority: 'low',
        category: 'other',
        requesterId: 4,
        assigneeId: 2,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5),
        updatedAt: new Date()
      },
      {
        subject: 'Atualização do sistema operacional',
        description: 'Precisamos atualizar o sistema para a nova versão.',
        status: 'open',
        priority: 'medium',
        category: 'technical_support',
        requesterId: 5,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5),
        updatedAt: new Date()
      }
    ];
    
    const createdTickets = await db.insert(tickets).values(ticketsList).returning();
    console.log(`✅ Added ${createdTickets.length} tickets`);
    
    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Execute o seed
seed();