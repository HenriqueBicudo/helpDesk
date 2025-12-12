import { db } from '../db-postgres';
import { slaTemplates, type SlaTemplate, type InsertSlaTemplate, type UpdateSlaTemplate, type SlaTemplateWithParsedRules, type SlaTemplateRule } from '../../shared/schema/sla_templates';
import { eq, and, sql } from 'drizzle-orm';

export class SlaTemplateService {
  /**
   * Buscar todos os templates ativos
   */
  async getAll(includeInactive = false): Promise<SlaTemplateWithParsedRules[]> {
    const conditions = includeInactive ? [] : [eq(slaTemplates.isActive, 1)];
    
    const templates = await db
      .select()
      .from(slaTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(slaTemplates.name);

    return templates.map(this.parseTemplateRules);
  }

  /**
   * Buscar template por ID
   */
  async getById(id: number): Promise<SlaTemplateWithParsedRules | null> {
    const [template] = await db
      .select()
      .from(slaTemplates)
      .where(eq(slaTemplates.id, id))
      .limit(1);

    return template ? this.parseTemplateRules(template) : null;
  }

  /**
   * Buscar templates por tipo
   */
  async getByType(type: string): Promise<SlaTemplateWithParsedRules[]> {
    const templates = await db
      .select()
      .from(slaTemplates)
      .where(and(
        eq(slaTemplates.type, type),
        eq(slaTemplates.isActive, 1)
      ))
      .orderBy(slaTemplates.name);

    return templates.map(this.parseTemplateRules);
  }

  /**
   * Criar novo template
   */
  async create(data: Omit<InsertSlaTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<SlaTemplateWithParsedRules> {
    const [newTemplate] = await db
      .insert(slaTemplates)
      .values({
        ...data,
        type: data.contractType, // Manter compatibilidade
        isActive: data.isActive ?? 1,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return this.parseTemplateRules(newTemplate);
  }

  /**
   * Atualizar template existente
   */
  async update(id: number, data: Partial<UpdateSlaTemplate>): Promise<SlaTemplateWithParsedRules | null> {
    const [updated] = await db
      .update(slaTemplates)
      .set({
        ...data,
        type: data.contractType ?? data.type, // Manter compatibilidade se contractType ou type for fornecido
        isActive: data.isActive ?? 1,
        updatedAt: new Date()
      })
      .where(eq(slaTemplates.id, id))
      .returning();

    return updated ? this.parseTemplateRules(updated) : null;
  }

  /**
   * Desativar template (soft delete)
   */
  async deactivate(id: number): Promise<boolean> {
    const [updated] = await db
      .update(slaTemplates)
      .set({ 
        isActive: 0,
        updatedAt: new Date()
      })
      .where(eq(slaTemplates.id, id))
      .returning();

    return !!updated;
  }

  /**
   * Deletar template permanentemente
   */
  async delete(id: number): Promise<boolean> {
    console.log(`🗑️ [SlaTemplateService] Deletando template ID: ${id}`);
    
    try {
      const result = await db
        .delete(slaTemplates)
        .where(eq(slaTemplates.id, id))
        .returning({ id: slaTemplates.id });

      const success = result.length > 0;
      console.log(`📊 [SlaTemplateService] Delete result: ${success} (${result.length} rows affected)`);
      
      return success;
    } catch (error) {
      console.error(`🚨 [SlaTemplateService] Erro ao deletar template ${id}:`, error);
      throw error;
    }
  }

  /**
   * Contar templates por tipo
   */
  async countByType(): Promise<Record<string, number>> {
    const result = await db
      .select({
        type: slaTemplates.type,
        count: sql<number>`count(*)::int`
      })
      .from(slaTemplates)
      .where(eq(slaTemplates.isActive, 1))
      .groupBy(slaTemplates.type);

    return result.reduce((acc, row) => {
      acc[row.type] = row.count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Helper: Parse regras JSON para TypeScript
   */
  private parseTemplateRules(template: SlaTemplate): SlaTemplateWithParsedRules {
    const { rules, ...rest } = template;
    
    try {
      const parsedRules = JSON.parse(rules) as SlaTemplateRule[];
      return {
        ...rest,
        rules: parsedRules
      };
    } catch (error) {
      console.error(`❌ Erro ao parsear regras do template ${template.id}:`, error);
      return {
        ...rest,
        rules: []
      };
    }
  }

  /**
   * Helper: Stringify regras para armazenar no banco
   */
  stringifyRules(rules: SlaTemplateRule[]): string {
    return JSON.stringify(rules);
  }
}

export const slaTemplateService = new SlaTemplateService();
