# Sistema de Temas - HelpDesk

## 📋 Visão Geral

O sistema de temas do HelpDesk permite personalização completa da interface, com suporte a:

- **6 Temas Pré-definidos** prontos para uso
- **Editor de Cores Avançado** para personalização
- **Suporte a Modo Claro/Escuro** independentes
- **Prévia em Tempo Real** dos temas
- **Exportar/Importar** configurações de tema
- **Sincronização Automática** entre componentes

## 🎨 Temas Pré-definidos

### 1. **HelpDesk Padrão** (default)
- Azul profissional e confiável
- Ideal para ambiente corporativo

### 2. **Oceano** (ocean)
- Tons de azul inspirados no oceano
- Transmite calma e serenidade

### 3. **Floresta** (forest)
- Verde natural e sustentável
- Perfeito para empresas eco-friendly

### 4. **Real** (royal)
- Roxo elegante e sofisticado
- Ideal para marcas premium

### 5. **Pôr do Sol** (sunset)
- Laranja vibrante e energético
- Ótimo para startups e empresas criativas

### 6. **Meia-Noite** (midnight)
- Escuro profundo e moderno
- Para usuários que preferem interfaces dark

## 🛠️ Como Usar

### Aplicar Tema Pré-definido
1. Vá para **Configurações > Aparência**
2. Clique na aba **"Temas Prontos"**
3. Use o botão 👁️ para visualizar o tema
4. Clique em **"Aplicar"** para ativar

### Personalizar Tema
1. Aplique um tema base ou use o atual
2. Vá para as abas **"Tema Claro"** ou **"Tema Escuro"**
3. Ajuste as cores usando os seletores
4. As mudanças são aplicadas em tempo real
5. Use **"Restaurar Padrão"** para voltar ao original

### Exportar/Importar Temas
- **Exportar**: Salva suas configurações em arquivo JSON
- **Importar**: Carrega configurações de arquivo JSON
- Útil para backup ou compartilhamento entre dispositivos

## 🎯 Variáveis de Tema

O sistema usa as seguintes variáveis CSS:

### Cores Principais
- `--primary`: Cor principal (botões, links, destaques)
- `--background`: Fundo principal da aplicação
- `--foreground`: Cor do texto principal
- `--card`: Fundo de cartões e painéis

### Cores Secundárias
- `--secondary`: Cor secundária para elementos auxiliares
- `--muted`: Cor para textos secundários e áreas suaves
- `--border`: Cor das bordas e divisores
- `--input`: Fundo de campos de entrada

### Cores de Estado
- `--destructive`: Cor para ações destrutivas e erros
- `--accent`: Cor de destaque adicional

## 💾 Armazenamento

- **Tema Ativo**: Salvo em `current-theme-id`
- **Cores Personalizadas**: Salvas em `theme-colors-light` e `theme-colors-dark`
- **Persistência**: Mantido no localStorage do navegador
- **Sincronização**: Automática entre abas do navegador

## 🔧 Desenvolvimento

### Adicionar Novo Tema Pré-definido

```typescript
{
  id: 'novo-tema',
  name: 'Nome do Tema',
  description: 'Descrição do tema',
  category: 'blue', // ou 'green', 'purple', etc.
  light: {
    primary: '#cor-principal',
    background: '#fundo',
    // ... outras cores
  },
  dark: {
    primary: '#cor-principal-dark',
    background: '#fundo-dark',
    // ... outras cores
  }
}
```

### Usar Variáveis de Tema em CSS

```css
.meu-componente {
  background-color: hsl(var(--card));
  color: hsl(var(--foreground));
  border-color: hsl(var(--border));
}
```

### Usar no Tailwind CSS

```html
<div className="bg-card text-foreground border-border">
  Conteúdo com tema
</div>
```

## 📱 Responsividade

O sistema de temas é totalmente responsivo:

- **Desktop**: Grid de 3 colunas para temas
- **Tablet**: Grid de 2 colunas
- **Mobile**: Coluna única com layout otimizado

## 🔄 Atualização Automática

- Mudanças são aplicadas **instantaneamente**
- **Observador de mutações** detecta alternância claro/escuro
- **Sincronização** automática entre componentes
- **Performance otimizada** com debounce

## 🎨 Boas Práticas

1. **Teste em Ambos os Modos**: Sempre verifique claro e escuro
2. **Contraste Adequado**: Garanta legibilidade do texto
3. **Consistência**: Use as variáveis do tema, não cores hardcoded
4. **Acessibilidade**: Mantenha contraste mínimo de 4.5:1
5. **Backup**: Exporte temas personalizados importantes

## 🐛 Troubleshooting

### Tema não aplica
- Verifique se as variáveis CSS estão sendo carregadas
- Limpe o cache do navegador
- Restaure o tema padrão e reaplique

### Cores não persistem
- Verifique se o localStorage está funcionando
- Confirme se não há bloqueios de cookies/storage
- Tente em modo anônimo para teste

### Performance lenta
- Reduza a frequência de mudanças de cor
- Use o debounce nos seletores de cor
- Verifique se há vazamentos de memory no observer

## 📚 Recursos Adicionais

- [Documentação Tailwind CSS](https://tailwindcss.com/docs)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Color Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
