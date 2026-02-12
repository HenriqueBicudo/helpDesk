import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../../storage-interface';
import { requireAuth, requireAuthAndPermission } from '../../middleware/auth';

/**
 * Router simplificado para operações CRUD de contratos
 */
export const contractSimpleRoutes = Router();

/**
 * GET /api/contracts
 * Lista todos os contratos
 */
contractSimpleRoutes.get('/', requireAuth, async (req, res) => {
  try {
    console.log('Buscando contratos...');
    
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    // client_user não pode ver contratos
    if (user.role === 'client_user') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      });
    }

    const contracts = await storage.getAllContracts();
    
    // Filtrar contratos baseado na função do usuário
    let filteredContracts = contracts;
    
    if (user.role === 'client_manager') {
      // client_manager só vê contratos da sua empresa
      filteredContracts = contracts.filter(contract => 
        contract.companyId === user.company
      );
    }
    // admin e helpdesk_* veem todos os contratos
    
    console.log('Contratos encontrados:', filteredContracts.length);
    
    res.json({
      success: true,
      data: filteredContracts
    });
  } catch (error) {
    console.error('Erro ao buscar contratos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/contracts/:id
 * Busca um contrato por ID
 */
contractSimpleRoutes.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Buscando contrato:', id);
    
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    // client_user não pode ver contratos
    if (user.role === 'client_user') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      });
    }

    const contract = await storage.getContract(id);
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato não encontrado'
      });
    }

    // Verificar se client_manager pode ver este contrato
    if (user.role === 'client_manager' && contract.companyId !== user.company) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado a este contrato'
      });
    }
    
    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Erro ao buscar contrato:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/companies
 * Lista todas as empresas
 */
contractSimpleRoutes.get('/companies/all', requireAuth, async (req, res) => {
  try {
    console.log('Buscando empresas...');
    
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    // client_user não pode ver empresas
    if (user.role === 'client_user') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      });
    }

    const companies = await storage.getAllCompanies();
    
    // Filtrar empresas baseado na função do usuário
    let filteredCompanies = companies;
    
    if (user.role === 'client_manager') {
      // client_manager só vê a sua empresa
      filteredCompanies = companies.filter(company => 
        company.id.toString() === user.company
      );
    }
    // admin e helpdesk_* veem todas as empresas
    
    console.log('Empresas encontradas:', filteredCompanies.length);
    
    res.json({
      success: true,
      data: filteredCompanies
    });
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});
