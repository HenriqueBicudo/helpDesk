import crypto from 'crypto';
import nodemailer from 'nodemailer';

/**
 * Gera uma senha aleatória segura
 * @param length - Tamanho da senha (padrão: 12)
 * @returns Senha aleatória
 */
export function generateRandomPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Garantir pelo menos um caractere de cada tipo
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += symbols[crypto.randomInt(0, symbols.length)];
  
  // Preencher o restante da senha
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Embaralhar a senha para não ter um padrão previsível
  return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
}

/**
 * Configura o transportador de email
 * Em produção, configure com suas credenciais SMTP reais
 */
function createEmailTransporter() {
  // Para desenvolvimento, usar Ethereal Email (emails de teste)
  // Em produção, substitua por suas credenciais SMTP reais (Gmail, SendGrid, etc)
  
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  // Fallback para desenvolvimento: apenas log no console
  return null;
}

export interface SendPasswordEmailOptions {
  to: string;
  fullName: string;
  username: string;
  password: string;
  isReset?: boolean;
}

/**
 * Envia email com a senha temporária para o usuário
 */
export async function sendPasswordEmail(options: SendPasswordEmailOptions): Promise<boolean> {
  const { to, fullName, username, password, isReset = false } = options;
  
  const subject = isReset 
    ? 'Senha Resetada - HelpDesk'
    : 'Bem-vindo ao HelpDesk - Sua Senha Temporária';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .content {
          background-color: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          color: #2563eb;
          margin-bottom: 20px;
        }
        .credentials {
          background-color: #f3f4f6;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .credentials p {
          margin: 10px 0;
        }
        .credentials strong {
          color: #1f2937;
        }
        .password-box {
          background-color: #dbeafe;
          color: #1e40af;
          padding: 10px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 16px;
          font-weight: bold;
          margin-top: 10px;
          word-break: break-all;
        }
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <h2 class="header">${isReset ? '🔄 Senha Resetada' : '👋 Bem-vindo ao HelpDesk'}</h2>
          
          <p>Olá <strong>${fullName}</strong>,</p>
          
          <p>${isReset 
            ? 'Sua senha foi resetada com sucesso. Use as credenciais abaixo para fazer login:' 
            : 'Sua conta foi criada com sucesso! Use as credenciais abaixo para fazer seu primeiro acesso:'
          }</p>
          
          <div class="credentials">
            <p><strong>Usuário:</strong> ${username}</p>
            <p><strong>Senha Temporária:</strong></p>
            <div class="password-box">${password}</div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Esta é uma senha temporária</li>
              <li>Você será solicitado a criar uma nova senha no primeiro login</li>
              <li>Não compartilhe esta senha com ninguém</li>
              <li>Este email é apenas para sua segurança</li>
            </ul>
          </div>
          
          <p>Para acessar o sistema, visite: <a href="${process.env.APP_URL || 'http://localhost:5000'}">${process.env.APP_URL || 'http://localhost:5000'}</a></p>
          
          <p>Se você não solicitou esta ${isReset ? 'alteração' : 'conta'}, entre em contato com o suporte imediatamente.</p>
          
          <div class="footer">
            <p>Este é um email automático, por favor não responda.</p>
            <p>&copy; ${new Date().getFullYear()} HelpDesk. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const textContent = `
${isReset ? 'Senha Resetada - HelpDesk' : 'Bem-vindo ao HelpDesk'}

Olá ${fullName},

${isReset 
  ? 'Sua senha foi resetada com sucesso. Use as credenciais abaixo para fazer login:' 
  : 'Sua conta foi criada com sucesso! Use as credenciais abaixo para fazer seu primeiro acesso:'
}

Usuário: ${username}
Senha Temporária: ${password}

⚠️ IMPORTANTE:
- Esta é uma senha temporária
- Você será solicitado a criar uma nova senha no primeiro login
- Não compartilhe esta senha com ninguém

Acesse: ${process.env.APP_URL || 'http://localhost:5000'}

Se você não solicitou esta ${isReset ? 'alteração' : 'conta'}, entre em contato com o suporte.

---
Este é um email automático, por favor não responda.
© ${new Date().getFullYear()} HelpDesk. Todos os direitos reservados.
  `.trim();
  
  const transporter = createEmailTransporter();
  
  if (!transporter) {
    // Modo desenvolvimento: apenas logar no console
    console.log('\n' + '='.repeat(80));
    console.log('📧 EMAIL DE SENHA TEMPORÁRIA');
    console.log('='.repeat(80));
    console.log(`Para: ${to}`);
    console.log(`Nome: ${fullName}`);
    console.log(`Assunto: ${subject}`);
    console.log('-'.repeat(80));
    console.log(`Usuário: ${username}`);
    console.log(`Senha Temporária: ${password}`);
    console.log('='.repeat(80) + '\n');
    
    return true;
  }
  
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"HelpDesk" <noreply@helpdesk.local>',
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });
    
    console.log(`✅ Email enviado com sucesso para ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao enviar email para ${to}:`, error);
    return false;
  }
}
