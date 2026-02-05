import { pgTable, integer, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';

/**
 * Tabela de categorias hierárquicas de equipes
 * Permite criar uma estrutura em árvore de categorias/subcategorias
 * Exemplo:
 *   Sistema Protheus (equipe)
 *   ├── RH (categoria pai)
 *   │   ├── Folha de Pagamento (subcategoria)
 *   │   └── Admissões (subcategoria)
 *   ├── Financeiro (categoria pai)
 *   └── Estoque (categoria pai)
 */
export const teamCategories = pgTable('team_categories', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  
  // Hierarquia: null = categoria raiz, valor = subcategoria
  parentCategoryId: integer('parent_category_id').references(() => teamCategories.id, { onDelete: 'cascade' }),
  
  // Ordenação para controlar a ordem de exibição
  sortOrder: integer('sort_order').notNull().default(0),
  
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Tabela de relacionamento entre categorias e usuários
 * Define quais usuários são responsáveis por cada categoria/subcategoria
 */
export const teamCategoryUsers = pgTable('team_category_users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  categoryId: integer('category_id').notNull().references(() => teamCategories.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Prioridade do usuário nesta categoria (1 = primeira opção, 2 = segunda, etc.)
  priority: integer('priority').notNull().default(1),
  
  // Se pode receber tickets automaticamente
  autoAssign: boolean('auto_assign').notNull().default(true),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Precisamos importar teams e users para as referências
import { teams } from '../drizzle-schema';
import { users } from '../drizzle-schema';

// Tipos TypeScript
export type TeamCategory = typeof teamCategories.$inferSelect;
export type NewTeamCategory = typeof teamCategories.$inferInsert;
export type TeamCategoryUser = typeof teamCategoryUsers.$inferSelect;
export type NewTeamCategoryUser = typeof teamCategoryUsers.$inferInsert;
