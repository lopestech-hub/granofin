---
trigger: always_on
---

# Regras de Trabalho

## 1. Transparência Total e Confirmação

- **SEMPRE PERGUNTE ANTES DE IMPLEMENTAR** quando eu fizer uma pergunta como "é possível...", "dá para...", "tem como...".
- Se eu perguntar SE algo é possível, responda APENAS se é possível e COMO faria, mas **NÃO IMPLEMENTE** sem eu pedir explicitamente.
- Somente implemente diretamente quando eu der um comando claro como "faça...", "implemente...", "corrija...".
- **ANTES** de executar qualquer ação (comando, edição de arquivo ou consulta), explique em Português o que pretende fazer e o objetivo.
- Sempre que eu solicitar uma **alteração**, primeiro confirme que entendeu o pedido, descreva brevemente a abordagem e informe os riscos.
- Somente após essa confirmação prossiga.

## 2. Comunicação

- Responda sempre em Português do Brasil.
- Seja proativo, mas sempre transparente sobre cada passo técnico.
- Sempre use nomes das tabelas e colunas do banco de dados em Português.
- Sempre use timezone America/Sao_Paulo (UTC-3) em toda aplicação, incluindo banco de dados.
- Comentários sempre em português.

## 3. MCP (Model Context Protocol)

- Sempre prefira MCP ao invés de comandos manuais quando disponível.
- MCPs configurados e quando usar cada um:
  - `bzrlink-db` → consultas diretas ao banco PostgreSQL do projeto BZRLINK
  - `coolify` → gerenciar deployments, apps, bancos e serviços na VPS
  - `n8n-mcp` → criar, editar e executar workflows no n8n
  - `n8n-workflows Docs` → consultar documentação de workflows n8n
  - `context7 Docs` → consultar documentação do Upstash Context7
- Para banco de dados do BZRLINK: usar `bzrlink-db` diretamente — sem precisar perguntar.

## 4. Alterações

- Sempre que precisar alterar algo, não mexa no que já está funcionando. Apenas altere o que está errado.

## 5. NUNCA FAÇA

- ❌ Reescrever código funcional sem motivo claro
- ❌ Introduzir novas tecnologias sem discussão
- ❌ Assumir estruturas de banco de dados ou APIs
- ❌ Deletar arquivos ou código sem confirmar
- ❌ Ignorar erros ou warnings existentes
- ❌ Criar soluções excessivamente complexas (overengineering)
- ❌ Repetir trechos de código (use funções/componentes reutilizáveis)
- ❌ Colocar toda lógica em um único arquivo (separe responsabilidades)
- ❌ Reinventar funcionalidades que já existem em bibliotecas consolidadas
- ❌ Commitar sem antes rodar a Vera (`/revisor`)
- ❌ Fazer deploy sem antes rodar o Delta (`/deploy`)
- ❌ Logar senhas, tokens JWT ou dados sensíveis (CPF, cartão)

## 6. Migrações de Banco de Dados

- Para alterações de schema ou dados em produção, NUNCA use `prisma migrate` ou `prisma db push`
- Crie scripts Node.js/TypeScript em `backend/scripts/` usando Prisma Client
- Use `$executeRawUnsafe` para DDL (ALTER, CREATE, DROP)
- Use `$executeRaw` para DML (UPDATE, INSERT, DELETE) com type-safety
- Use `$queryRaw` para consultas (SELECT)
- Execute via `npx tsx scripts/nome-do-script.ts`
- Sempre adicione logs detalhados e verificação de resultados
- Sempre desconecte o Prisma ao final: `await prisma.$disconnect()`

## 7. Padrão de Desenvolvimento e Deploy

- **Banco de dados**: Sempre fica na VPS (nunca local)
- **Desenvolvimento**: Local, conectando no banco da VPS
- **Deploy**: Dockerfile único que builda backend + frontend juntos
- **Dockerfile**: sempre inclui `COPY backend/prisma ./prisma` e `RUN npx prisma generate` antes do build
- **Estrutura do Dockerfile**: Backend serve o frontend buildado (arquivos estáticos)
- **Fluxo**: Dev local → Vera (`/revisor`) → commit → Delta (`/deploy`) → push → Coolify/EasyPanel deploya automaticamente
- **Antes do push**: verificar variáveis de ambiente na plataforma, migrations pendentes e saúde do Dockerfile

## 8. Testes

- Padrão: **Vitest** para backend e frontend — nunca Jest em projetos novos com Vite
- Banco de teste separado do banco de desenvolvimento — nunca compartilhar
- Rodar `npm test` antes de commitar em features importantes
- Em caso de bug em produção, escrever o teste que teria pego o bug antes de corrigir
- Para configurar ou gerar testes: chamar a Quinn (`/testes`)

## 9. Git e Commits

- **Sempre chamar a Vera (`/revisor`) antes de commitar** — zero commits sem code review
- Commits em português, descritivos e objetivos
- Formato: `tipo: descrição` (ex: `fix: corrige cálculo de estoque`, `feat: adiciona filtro por data`)
- Tipos: `feat` (nova feature), `fix` (correção), `refactor` (refatoração), `docs` (documentação), `style` (formatação)

## 10. Tratamento de Erros

- Backend: sempre retornar erros com estrutura padrão `{ success: false, error: "mensagem" }`
- Logar erros importantes com Pino, com contexto suficiente para debug
- Nunca expor stack traces ou informações sensíveis para o frontend em produção

## 11. Memória do Projeto (CONTEXTO.MD)

**TODA conversa começa com este protocolo — automático, sem esperar o usuário pedir:**

1. **Localizar:** ler `CONTEXTO.MD` na raiz do workspace atual com a ferramenta Read. Se não achar, buscar com Glob `**/CONTEXTO.MD`
2. **Se encontrado:** carregar como memória completa do projeto — equivale ao histórico de todas as sessões anteriores. Nunca pergunte o que já está documentado. Confirmar ao usuário: _"Contexto carregado: [projeto], fase: [fase], próximos passos: [resumo]"_
3. **Se não encontrado:**
   - Projeto novo → chamar o Theo (`/arquiteto`) para iniciar as 12 etapas de planejamento
   - Projeto existente sem arquivo → explorar estrutura, `package.json`, `schema.prisma` e reconstruir o `CONTEXTO.MD` antes de qualquer outra ação
4. **Atualizar automaticamente** após qualquer mudança significativa (nova tabela, rota, decisão, lib, fase concluída)
5. **Obrigatório antes de encerrar** a sessão: atualizar "Última Sessão", "Próximos Passos" e "Histórico de Mudanças"

## 12. Frontend

- NUNCA remova funcionalidades ou informações existentes ao implementar novas solicitações.
- SEMPRE chame a Aria (`/design-engineer`) para qualquer mudança no frontend.
- SEMPRE rode `/simplify` após implementar para garantir qualidade e reuso.
- SEMPRE use `cursor-pointer` (Tailwind) em todo elemento clicável — `<button>`, `<a>`, `onClick` em divs, cards, ícones, linhas de tabela, badges. Se tem clique, tem `cursor-pointer`.

## 13. Versionamento e Cache (Frontend)

- Todo projeto Web deve ter detector de nova versão automática.
- `public/version.json`: deve existir com campos `version` e `timestamp`.
- Monitoramento: frontend checa o arquivo a cada 5 ou 10 minutos.
- Notificação: se a versão do servidor for diferente da local, exibir Toast convidando a recarregar (`window.location.reload()`).
- `index.html` deve ser servido com `Cache-Control: no-cache`.
- Implementar sempre na **Fase 1** — nunca deixar para depois.

## 14. Agentes Disponíveis — Fluxo de Trabalho

Cada skill é um agente especializado com nome próprio. Usar no momento certo é obrigatório:

| Momento | Agente | Skill | O que faz |
| --- | --- | --- | --- |
| Início de sessão | **Scout** | `/sessao` | Lê o projeto inteiro e reconstrói o contexto antes de qualquer trabalho |
| Projeto novo | **Theo** | `/arquiteto` | Planeja as 12 etapas antes de escrever código |
| Qualquer tela/componente | **Aria** | `/design-engineer` | Mantém consistência visual e sistema de design |
| Após implementar | — | `/simplify` | Melhora qualidade e elimina duplicação |
| Antes de commitar | **Vera** | `/revisor` | Code review: segurança, performance, boas práticas |
| Bug encontrado | **Rex** | `/debug` | Diagnóstico sistemático — causa raiz antes de corrigir |
| Antes do push | **Delta** | `/deploy` | Checklist completo: Dockerfile, envs, migrations, saúde |
| Configurar/gerar testes | **Quinn** | `/testes` | Vitest por camada com banco separado |

**Fluxo ideal de um dia de trabalho:**

```text
Scout (/sessao) → implementa → Aria (/design-engineer) → /simplify → Vera (/revisor) → commit → Delta (/deploy) → push
```
