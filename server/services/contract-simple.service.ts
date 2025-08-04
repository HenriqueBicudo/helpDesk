import { db } from '../db-drizzle';
import { contracts } from '../../shared/schema/contracts';
import { eq } from 'drizzle-orm';

export class ContractService {
  /**
   * Busca um contrato específico por ID - Versão simplificada
   */
  async findById(id: string): Promise<any> {
    try {
      const result = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, id))
        .limit(1);
      
      if (result.length === 0) {
        return null;
      }
      
      const contract = result[0];
      
      return {
        id: contract.id,
        contractNumber: contract.contractNumber,
        companyId: contract.companyId,
        type: contract.type,
        status: contract.status,
        isActive: contract.status === 'active',
        startDate: contract.startDate,
        endDate: contract.endDate,
        includedHours: contract.includedHours,
        usedHours: contract.usedHours,
        monthlyValue: contract.monthlyValue,
      };
    } catch (error) {
      console.error('Erro no ContractService.findById:', error);
      throw error;
    }
  }

  /**
   * Atualiza um contrato - Versão simplificada
   */
  async update(id: string, data: any): Promise<any> {
    try {
      const result = await db
        .update(contracts)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Erro no ContractService.update:', error);
      throw error;
    }
  }
}
