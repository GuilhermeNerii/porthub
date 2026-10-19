# >_ PORTHUB — Hub Autônomo de Portes e Preservação de Jogos Clássicos para PC

O **PORTHUB** é uma plataforma web estática de alta performance que cataloga e acompanha automaticamente o ecossistema de preservação de jogos clássicos no PC: **decompilações matching**, **recompilações estáticas**, **portes nativos**, **portes híbridos (x86-64 + Vulkan)** e **emuladores oficiais**.

O diferencial de engenharia: **ele opera 100% sem servidor e se atualiza sozinho a cada 6 horas via GitHub Actions**, mantendo histórico auditável de releases, marcos de estrelas e fila de descoberta do PCGamingWiki.

---

## 1. Como Rodar Localmente

Pré-requisitos: **Node.js 22+** e **npm**.

```bash
# 1. Instale as dependências (versões fixas)
npm install

# 2. Inicie o servidor de desenvolvimento Astro
npm run dev

# 3. Rode a verificação estrita de tipos (TypeScript) e testes unitários (Vitest)
npm run lint
npm test

# 4. Gere o build estático de produção (valida todos os JSONs via Zod)
npm run build
```
2. Como Funciona a Atualização Automática
O script scripts/update-data.ts é executado a cada 6 horas pelo workflow .github/workflows/update-and-deploy.yml (ou manualmente com npm run update-data):

GitHub REST API com Cache Condicional (ETag / If-None-Match): Consulta estrelas, forks, issues abertas, linguagem, data do último commit e última release de cada projeto listado em data/projects.json. Repositórios inalterados retornam HTTP 304 Not Modified, economizando a cota da API.
Tolerância a Takedowns / Remoções (HTTP 404 / 451): Se um porte de fãs for removido ou tornado privado, o pipeline preserva o último snapshot válido em data/generated.json, registra o evento em data/history.json e nunca derruba o build.
Progresso de Decompilação (decomp.dev): Quando decompDevPath está configurado no projeto, consulta o percentual de código decompilado com fallback seguro caso o endpoint esteja indisponível.
Descoberta Semi-Automática (PCGamingWiki): Consulta a página List of unofficial ports via API MediaWiki e grava projetos inéditos em data/candidates.json para revisão humana obrigatória (candidatos nunca entram no ar sem validação manual).
3. Como Adicionar um Novo Projeto
Abra data/projects.json (ou revise uma sugestão em data/candidates.json).
Verifique manualmente se o repositório GitHub/GitLab existe, contém código legítimo e não distribui ROMs, ISOs ou binários protegidos.
Adicione o objeto respeitando o contrato ProjectSchema (src/data/schema.ts), garantindo que o campo requirements mencione explicitamente "Requer uma cópia legítima do jogo".
Execute npm test && npm run build para validar o esquema Zod e gerar a página e a imagem Open Graph (/og/[slug].svg).
4. Como Publicar no GitHub Pages
Suba o repositório no seu GitHub.
Em Settings → Pages, em Build and deployment, selecione Source: GitHub Actions.
Em Settings → Actions → General → Workflow permissions, habilite Read and write permissions.
Acione manualmente o workflow Autonomous Data Pipeline & Deploy Pages na aba Actions (ou aguarde o cron de 6 horas).
5. Aviso Legal (Legal Disclaimer)
O PORTHUB apenas lista e referencia repositórios abertos de engenharia reversa e preservação. É terminantemente proibido incluir ou linkar ROMs, ISOs, dumps, binários de jogos, chaves criptográficas ou assets protegidos por direitos autorais. Todos os projetos listados exigem que o usuário possua uma cópia legítima do jogo original. Consulte a página /aviso-legal para instruções de remoção (DMCA).
