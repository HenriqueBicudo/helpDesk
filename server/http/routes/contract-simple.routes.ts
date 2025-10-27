import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../../storage-interface';

/**
 * Router simplificado para operações CRUD de contratos
 */
export const contractSimpleRoutes = Router();

/**
 * GET /api/contracts
 * Lista todos os contratos
 */
contractSimpleRoutes.get('/', async (req, res) => {
  try {
    console.log('Buscando contratos...');
    const contracts = await storage.getAllContracts();
    console.log('Contratos encontrados:', contracts.length);
    
    res.json({
      success: true,
      data: contracts
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
contractSimpleRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Buscando contrato:', id);
    const contract = await storage.getContract(id);
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato não encontrado'
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
contractSimpleRoutes.get('/companies/all', async (req, res) => {
  try {
    console.log('Buscando empresas...');
    const companies = await storage.getAllCompanies();
    console.log('Empresas encontradas:', companies.length);
    
    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});
