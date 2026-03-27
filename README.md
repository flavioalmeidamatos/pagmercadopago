# Lumina Beaute

E-commerce premium para cosméticos e skincare construído com Next.js, TypeScript, Tailwind CSS, shadcn/ui patterns, Supabase e Stripe.

## Scripts

```bash
npm install
cp .env.example .env.local
npm run dev
npm run build
npm run start
```

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Database e Storage
- Stripe Checkout, Customer Portal e Webhooks
- Deploy pronto para Vercel

## Variáveis de ambiente

Use `.env.example` como base e preencha em `.env.local`.

### Mínimo para testes locais

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Com isso, já é possível validar navegação, catálogo, login e sessão.

### Para testar fluxos administrativos e checkout

```bash
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET_LIVE=
```

Ao rodar `npm run dev`, o projeto faz uma checagem local e avisa quais variáveis ainda faltam.

Observação: este repositório usa Next.js. Chaves antigas como `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `FRONTEND_URL` não habilitam autenticação no cliente.

## Banco

O schema inicial do Supabase está em `supabase/migrations/20260325180000_initial_luxury_store_schema.sql`.
