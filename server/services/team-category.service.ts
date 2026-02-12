import { db } from '../db-postgres';
import { teamCategories, teamCategoryUsers } from '@shared/drizzle-schema';
import { eq, and, isNull, asc, desc } from 'drizzle-orm';

interface CreateCategoryInput {
  teamId: number;
  name: string;
  description?: string;
  parentCategoryId?: number | null;
  sortOrder?: number;
}

interface UpdateCategoryInput {
  name?: string;
  description?: string;
  parentCategoryId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

interface AssignUserToCategoryInput {
  categoryId: number;
  userId: number;
  priority?: number;
  autoAssign?: boolean;
}

export class TeamCategoryService {
  /**
   * Criar nova categoria ou subcategoria
   */
  async createCategory(data: CreateCategoryInput) {
    const [category] = await db.insert(teamCategories).values({
      teamId: data.teamId,
      name: data.name,
      description: data.description,
      parentCategoryId: data.parentCategoryId,
      sortOrder: data.sortOrder || 0,
    }).returning();
    
    return category;
  }

  /**
   * Atualizar categoria existente
   */
  async updateCategory(categoryId: number, data: UpdateCategoryInput) {
    const [category] = await db
      .update(teamCategories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(teamCategories.id, categoryId))
      .returning();
    
    return category;
  }

  /**
   * Deletar categoria (e todas as subcategorias devido ao CASCADE)
   */
  async deleteCategory(categoryId: number) {
    await db.delete(teamCategories).where(eq(teamCategories.id, categoryId));
  }

  /**
   * Buscar todas as categorias de uma equipe (estrutura plana)
   */
  async getCategoriesByTeam(teamId: number) {
    return await db
      .select()
      .from(teamCategories)
      .where(and(
        eq(teamCategories.teamId, teamId),
        eq(teamCategories.isActive, true)
      ))
      .orderBy(asc(teamCategories.sortOrder), asc(teamCategories.name));
  }

  /**
   * Buscar categorias raiz de uma equipe (sem pai)
   */
  async getRootCategories(teamId: number) {
    return await db
      .select()
      .from(teamCategories)
      .where(and(
        eq(teamCategories.teamId, teamId),
        isNull(teamCategories.parentCategoryId),
        eq(teamCategories.isActive, true)
      ))
      .orderBy(asc(teamCategories.sortOrder), asc(teamCategories.name));
  }

  /**
   * Buscar subcategorias de uma categoria
   */
  async getSubcategories(parentCategoryId: number) {
    return await db
      .select()
      .from(teamCategories)
      .where(and(
        eq(teamCategories.parentCategoryId, parentCategoryId),
        eq(teamCategories.isActive, true)
      ))
      .orderBy(asc(teamCategories.sortOrder), asc(teamCategories.name));
  }

  /**
   * Buscar estrutura hierárquica completa de uma equipe
   */
  async getCategoryTree(teamId: number): Promise<any[]> {
    const allCategories = await this.getCategoriesByTeam(teamId);
    
    // Criar um mapa para acesso rápido
    const categoryMap = new Map();
    allCategories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });
    
    // Construir árvore
    const tree: any[] = [];
    allCategories.forEach(cat => {
      const node = categoryMap.get(cat.id);
      if (cat.parentCategoryId) {
        const parent = categoryMap.get(cat.parentCategoryId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        tree.push(node);
      }
    });
    
    return tree;
  }

  /**
   * Atribuir usuário a uma categoria
   */
  async assignUserToCategory(data: AssignUserToCategoryInput) {
    const [assignment] = await db
      .insert(teamCategoryUsers)
      .values({
        categoryId: data.categoryId,
        userId: data.userId,
        priority: data.priority || 1,
        autoAssign: data.autoAssign !== undefined ? data.autoAssign : true,
      })
      .onConflictDoUpdate({
        target: [teamCategoryUsers.categoryId, teamCategoryUsers.userId],
        set: {
          priority: data.priority || 1,
          autoAssign: data.autoAssign !== undefined ? data.autoAssign : true,
        },
      })
      .returning();
    
    return assignment;
  }

  /**
   * Remover usuário de uma categoria
   */
  async removeUserFromCategory(categoryId: number, userId: number) {
    await db
      .delete(teamCategoryUsers)
      .where(and(
        eq(teamCategoryUsers.categoryId, categoryId),
        eq(teamCategoryUsers.userId, userId)
      ));
  }

  /**
   * Buscar usuários de uma categoria
   */
  async getCategoryUsers(categoryId: number) {
    const result = await db
      .select({
        id: teamCategoryUsers.id,
        userId: teamCategoryUsers.userId,
        priority: teamCategoryUsers.priority,
        autoAssign: teamCategoryUsers.autoAssign,
        createdAt: teamCategoryUsers.createdAt,
      })
      .from(teamCategoryUsers)
      .where(eq(teamCategoryUsers.categoryId, categoryId))
      .orderBy(asc(teamCategoryUsers.priority));
    
    return result;
  }

  /**
   * Buscar próximo usuário disponível para distribuição automática
   * Considera a prioridade e retorna o usuário com menor prioridade (1 = primeira opção)
   */
  async getNextAvailableUser(categoryId: number) {
    const users = await db
      .select({
        userId: teamCategoryUsers.userId,
        priority: teamCategoryUsers.priority,
      })
      .from(teamCategoryUsers)
      .where(and(
        eq(teamCategoryUsers.categoryId, categoryId),
        eq(teamCategoryUsers.autoAssign, true)
      ))
      .orderBy(asc(teamCategoryUsers.priority))
      .limit(1);
    
    return users[0]?.userId || null;
  }

  /**
   * Mover categoria para outra posição (reordenar)
   */
  async reorderCategory(categoryId: number, newSortOrder: number) {
    return await this.updateCategory(categoryId, { sortOrder: newSortOrder });
  }
}

export const teamCategoryService = new TeamCategoryService();
