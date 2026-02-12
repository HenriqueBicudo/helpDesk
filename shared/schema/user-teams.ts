import { pgTable, integer, timestamp, boolean, primaryKey } from 'drizzle-orm/pg-core';
import { users } from '../drizzle-schema';
import { teams } from '../drizzle-schema';

// Tabela de relacionamento muitos-para-muitos entre usuários e equipes
export const userTeams = pgTable('user_teams', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  isPrimary: boolean('is_primary').notNull().default(false), // Marca a equipe principal do usuário
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.teamId] })
  };
});
