# divideai-app-trae
App para divisão de contas de forma rápidas, fácil e justa!

## Deploy Web (1.0)

- Pré-requisitos: definir `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` no ambiente de build/deploy.
- Build estático:
  - `npm run web:export` (gera `dist/`)
- Preview local (SPA):
  - `npm run web:serve` e abrir `http://localhost:3000/`

### Netlify
- Build command: `npm run web:export`
- Publish directory: `dist`
- Environment: adicionar `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Redirects (SPA): criar arquivo `public/_redirects` com `/* /index.html 200` (alternativamente configurar no UI)

### Vercel
- Build command: `npm run web:export`
- Output directory: `dist`
- Environment: adicionar `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Rewrites (SPA): usar configuração padrão de Single Page App para servir `index.html`

### Observações
- Navegação: React Navigation funciona em web como SPA; servidor deve redirecionar 404 para `index.html`.
- Supabase: chaves públicas devem ser do projeto de produção; verifique RLS e políticas.
