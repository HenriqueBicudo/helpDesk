import { config } from 'dotenv';
import pg from 'pg';

// Carrega as variáveis de ambiente do arquivo .env
config();

// Cria a pool de conexão com o PostgreSQL
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Verifica a conexão
pool.connect()
  .then(client => {
    console.log('Conectado ao PostgreSQL com sucesso!');
    client.release();
  })
  .catch(err => {
    console.error('Erro ao conectar ao PostgreSQL:', err);
  });

// Exporta a pool
export { pool };

// Classe utilitária para operações no banco de dados
export class DB {
  // Executar uma consulta
  static async query<T>(query: string, params: any[] = []): Promise<T[]> {
    try {
      const client = await pool.connect();
      try {
        // No PostgreSQL, parâmetros são representados por $1, $2, etc.
        const result = await client.query(query, params);
        return result.rows as T[];
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erro ao executar consulta SQL:', error);
      throw error;
    }
  }
  
  // Obter um único registro
  static async getOne<T>(query: string, params: any[] = []): Promise<T | undefined> {
    const results = await this.query<T>(query, params);
    return results.length > 0 ? results[0] : undefined;
  }
  
  // Inserir dados e retornar o ID inserido
  static async insert(table: string, data: Record<string, any>): Promise<number> {
    try {
      const client = await pool.connect();
      try {
        // Prepara os campos e valores para inserção
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(data);
        
        const query = `
          INSERT INTO ${table} (${columns})
          VALUES (${placeholders})
          RETURNING id
        `;
        
        const result = await client.query(query, values);
        return result.rows[0].id;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Erro ao inserir em ${table}:`, error);
      throw error;
    }
  }
  
  // Atualizar dados
  static async update(table: string, id: number, data: Record<string, any>): Promise<boolean> {
    try {
      const client = await pool.connect();
      try {
        // Prepara os campos para atualização
        const keys = Object.keys(data);
        const setClause = keys
          .map((key, index) => `${key} = $${index + 1}`)
          .join(', ');
        
        const values = [...Object.values(data), id];
        
        const query = `
          UPDATE ${table}
          SET ${setClause}
          WHERE id = $${keys.length + 1}
        `;
        
        const result = await client.query(query, values);
        return result.rowCount ? result.rowCount > 0 : false;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Erro ao atualizar em ${table}:`, error);
      throw error;
    }
  }
  
  // Excluir dados
  static async delete(table: string, id: number): Promise<boolean> {
    try {
      const client = await pool.connect();
      try {
        const query = `
          DELETE FROM ${table}
          WHERE id = $1
        `;
        
        const result = await client.query(query, [id]);
        return result.rowCount ? result.rowCount > 0 : false;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Erro ao excluir em ${table}:`, error);
      throw error;
    }
  }
}
