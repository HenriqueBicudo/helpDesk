// Teste do componente SlaDueWarning
import { SlaDueWarning } from '../src/components/tickets/sla-due-warning';

// Teste 1: Ticket vencido há 2 horas
const vencidoEm2Horas = new Date();
vencidoEm2Horas.setHours(vencidoEm2Horas.getHours() - 2);

console.log('=== TESTE 1: Ticket vencido há 2 horas ===');
console.log('Data de vencimento:', vencidoEm2Horas.toLocaleString('pt-BR'));
console.log('Deve mostrar: "Venceu DD/MM HH:mm" em vermelho');

// Teste 2: Ticket vence em 1 hora
const venceEm1Hora = new Date();
venceEm1Hora.setHours(venceEm1Hora.getHours() + 1);

console.log('\n=== TESTE 2: Ticket vence em 1 hora ===');
console.log('Data de vencimento:', venceEm1Hora.toLocaleString('pt-BR'));
console.log('Deve mostrar: "Vence DD/MM HH:mm" em laranja');

// Teste 3: Ticket vence em 4 horas
const venceEm4Horas = new Date();
venceEm4Horas.setHours(venceEm4Horas.getHours() + 4);

console.log('\n=== TESTE 3: Ticket vence em 4 horas ===');
console.log('Data de vencimento:', venceEm4Horas.toLocaleString('pt-BR'));
console.log('Deve mostrar: "Vence DD/MM HH:mm" em amarelo');

// Teste 4: Ticket vence em 12 horas
const venceEm12Horas = new Date();
venceEm12Horas.setHours(venceEm12Horas.getHours() + 12);

console.log('\n=== TESTE 4: Ticket vence em 12 horas ===');
console.log('Data de vencimento:', venceEm12Horas.toLocaleString('pt-BR'));
console.log('Deve mostrar: "Vence DD/MM HH:mm" em azul');

// Teste 5: Ticket vence em 2 dias (não deve mostrar)
const venceEm2Dias = new Date();
venceEm2Dias.setDate(venceEm2Dias.getDate() + 2);

console.log('\n=== TESTE 5: Ticket vence em 2 dias ===');
console.log('Data de vencimento:', venceEm2Dias.toLocaleString('pt-BR'));
console.log('Deve mostrar: Nada (não exibe para > 24h)');

console.log('\n=== FORMATAÇÃO ESPERADA ===');
console.log('Formato da data: DD/MM HH:mm');
console.log('Exemplo: 01/08 14:30');
console.log('Cores:');
console.log('- Vencido: Vermelho');
console.log('- Vence em <= 2h: Laranja');
console.log('- Vence em <= 6h: Amarelo');
console.log('- Vence em <= 24h: Azul');
