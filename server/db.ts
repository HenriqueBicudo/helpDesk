import { config } from "dotenv";
import sql from "mssql";

// Carrega as variáveis de ambiente do arquivo .env
config();

// Configuração da conexão com o SQL Server
const dbConfig: sql.config = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "your_password",
  server: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "1433", 10),
  database: process.env.DB_NAME || "your_database",
  options: {
    encrypt: process.env.DB_ENCRYPT === "true", // Define se a conexão deve ser criptografada
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true", // Confiança no certificado do servidor
    enableArithAbort: process.env.DB_ENABLE_ARITH_ABORT === "true", // Habilita ARITHABORT
  },
};

// Cria a pool de conexão com o SQL Server
const pool = new sql.ConnectionPool(dbConfig);

// Verifica a conexão
pool.connect()
  .then(() => {
    console.log("Conectado ao SQL Server com sucesso!");
  })
  .catch((err) => {
    console.error("Erro ao conectar ao SQL Server:", err);
  });

// Exporta a pool
export { pool };

// Classe utilitária para operações no banco de dados
export class DB {
  // Executar uma consulta
  static async query<T>(query: string, params: any[] = []): Promise<T[]> {
    try {
      const request = pool.request();
      params.forEach((param, index) => {
        request.input(`param${index + 1}`, param);
      });

      const result = await request.query(query);
      return result.recordset as T[];
    } catch (error) {
      console.error("Erro ao executar consulta SQL:", error);
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
      const keys = Object.keys(data);
      const columns = keys.join(", ");
      const values = keys.map((_, index) => `@param${index + 1}`).join(", ");

      const request = pool.request();
      keys.forEach((key, index) => {
        request.input(`param${index + 1}`, data[key]);
      });

      const query = `
        INSERT INTO ${table} (${columns})
        OUTPUT INSERTED.id
        VALUES (${values})
      `;

      const result = await request.query(query);
      return result.recordset[0].id;
    } catch (error) {
      console.error(`Erro ao inserir em ${table}:`, error);
      throw error;
    }
  }

  // Atualizar dados
  static async update(table: string, id: number, data: Record<string, any>): Promise<boolean> {
    try {
      const keys = Object.keys(data);
      const setClause = keys.map((key, index) => `${key} = @param${index + 1}`).join(", ");

      const request = pool.request();
      keys.forEach((key, index) => {
        request.input(`param${index + 1}`, data[key]);
      });
      request.input(`id`, id);

      const query = `
        UPDATE ${table}
        SET ${setClause}
        WHERE id = @id
      `;

      const result = await request.query(query);
      return result.rowsAffected[0] > 0;
    } catch (error) {
      console.error(`Erro ao atualizar em ${table}:`, error);
      throw error;
    }
  }

  // Excluir dados
  static async delete(table: string, id: number): Promise<boolean> {
    try {
      const request = pool.request();
      request.input("id", id);

      const query = `
        DELETE FROM ${table}
        WHERE id = @id
      `;

      const result = await request.query(query);
      return result.rowsAffected[0] > 0;
    } catch (error) {
      console.error(`Erro ao excluir em ${table}:`, error);
      throw error;
    }
  }
}