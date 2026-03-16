# cadclientes

Loja em React + TypeScript + Vite com carrinho de compras.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Estrutura principal

- `src/App.tsx`: vitrine principal
- `src/components`: interface de produtos, carrinho e checkout
- `src/context/CartContext.tsx`: estado global do carrinho
- `server/index.js`: backend local

## Observações

- Não alterar `.env.local` automaticamente.
- Qualquer mudança de banco deve ser feita por migration versionada.
- Deploy em produção só com confirmação.
