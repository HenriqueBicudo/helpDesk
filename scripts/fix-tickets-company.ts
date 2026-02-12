import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tickets, requesters, companies } from '../shared/drizzle-schema';
import { eq, isNull, isNotNull, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function fixTicketCompanies() {
  console.log('🔧 Corrigindo company_id dos tickets...\n');
  
  // Buscar tickets sem company_id mas com requester
  const ticketsToFix = await db
    .select({
      id: tickets.id,
      subject: tickets.subject,
      requesterId: tickets.requesterId,
    })
    .from(tickets)
    .where(and(
      isNull(tickets.companyId),
      isNotNull(tickets.requesterId)
    ));
  
  console.log(`📋 Encontrados ${ticketsToFix.length} tickets para corrigir\n`);
  
  let fixed = 0;
  let errors = 0;
  
  for (const ticket of ticketsToFix) {
    try {
      // Buscar requester
      const requesterData = await db
        .select()
        .from(requesters)
        .where(eq(requesters.id, ticket.requesterId!))
        .limit(1);
      
      if (!requesterData[0] || !requesterData[0].company) {
        console.log(`⚠️  Ticket ${ticket.id}: Requester sem empresa`);
        continue;
      }
      
      // Buscar empresa pelo nome
      const companyData = await db
        .select()
        .from(companies)
        .where(eq(companies.name, requesterData[0].company))
        .limit(1);
      
      if (!companyData[0]) {
        console.log(`⚠️  Ticket ${ticket.id}: Empresa "${requesterData[0].company}" não encontrada`);
        continue;
      }
      
      // Atualizar ticket
      await db
        .update(tickets)
        .set({ companyId: companyData[0].id })
        .where(eq(tickets.id, ticket.id));
      
      console.log(`✅ Ticket ${ticket.id} (${ticket.subject}): company_id = ${companyData[0].id} (${companyData[0].name})`);
      fixed++;
    } catch (err) {
      console.error(`❌ Erro ao corrigir ticket ${ticket.id}:`, err);
      errors++;
    }
  }
  
  console.log(`\n✅ Concluído: ${fixed} tickets corrigidos, ${errors} erros`);
  
  await client.end();
}

fixTicketCompanies().catch(console.error);
