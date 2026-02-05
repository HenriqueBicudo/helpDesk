# 🌱 Script de Setup Rápido do HelpDesk (Windows)
# Este script configura o projeto automaticamente em um novo ambiente Windows

Write-Host "🚀 Iniciando setup do HelpDesk..." -ForegroundColor Cyan
Write-Host ""

# Verificar se Node.js está instalado
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js $nodeVersion encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado. Por favor, instale Node.js primeiro." -ForegroundColor Red
    Write-Host "   Download: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verificar se PostgreSQL está acessível
try {
    $psqlVersion = psql --version
    Write-Host "✅ PostgreSQL encontrado" -ForegroundColor Green
} catch {
    Write-Host "⚠️  PostgreSQL não encontrado no PATH." -ForegroundColor Yellow
    Write-Host "   Certifique-se de que o PostgreSQL está instalado e rodando." -ForegroundColor Yellow
}

# Instalar dependências do servidor
Write-Host ""
Write-Host "📦 Instalando dependências do servidor..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências do servidor" -ForegroundColor Red
    exit 1
}

# Instalar dependências do client
Write-Host ""
Write-Host "📦 Instalando dependências do client..." -ForegroundColor Cyan
Set-Location client
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências do client" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# Verificar se .env existe
if (-not (Test-Path .env)) {
    Write-Host ""
    Write-Host "📝 Criando arquivo .env a partir do template..." -ForegroundColor Cyan
    Copy-Item .env.example .env
    Write-Host "⚠️  ATENÇÃO: Edite o arquivo .env com suas configurações!" -ForegroundColor Yellow
    Write-Host ""
    
    $response = Read-Host "Deseja abrir o .env no notepad agora? (S/n)"
    if ($response -match '^[Ss]?$') {
        notepad .env
    }
    
    Write-Host ""
    Read-Host "Pressione ENTER depois de configurar o .env (ou CTRL+C para cancelar)"
}

# Perguntar se deseja popular o banco
Write-Host ""
$response = Read-Host "🌱 Deseja popular o banco de dados com dados de exemplo? (S/n)"

if ($response -match '^[Ss]?$') {
    Write-Host ""
    Write-Host "🗄️  Aplicando schema e populando banco..." -ForegroundColor Cyan
    npm run db:seed
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Banco de dados configurado com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔐 Credenciais de acesso:" -ForegroundColor Cyan
        Write-Host "   Admin:    admin / admin123" -ForegroundColor White
        Write-Host "   Manager:  manager / manager123" -ForegroundColor White
        Write-Host "   Agente:   agent1 / agent123" -ForegroundColor White
        Write-Host "   Cliente:  client1 / client123" -ForegroundColor White
    } else {
        Write-Host "❌ Erro ao configurar banco de dados" -ForegroundColor Red
        Write-Host "   Verifique se o DATABASE_URL no .env está correto" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "✨ Setup concluído com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Para iniciar a aplicação, execute:" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentação disponível em:" -ForegroundColor Cyan
Write-Host "   - QUICK_START.md - Comandos rápidos" -ForegroundColor White
Write-Host "   - SEED_README.md - Guia completo da seed" -ForegroundColor White
Write-Host "   - MIGRATION_GUIDE.md - Migração entre computadores" -ForegroundColor White
Write-Host ""

# Perguntar se deseja iniciar agora
$response = Read-Host "Deseja iniciar a aplicação agora? (S/n)"
if ($response -match '^[Ss]?$') {
    Write-Host ""
    Write-Host "🚀 Iniciando aplicação..." -ForegroundColor Cyan
    npm run dev
}
