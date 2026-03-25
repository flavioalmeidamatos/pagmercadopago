# cadclientes

Loja em React + TypeScript + Vite com carrinho de compras. A integração com Mercado Pago foi removida para preparar a entrada de um novo gateway de pagamento.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Estrutura principal

- `src/App.tsx`: vitrine principal
- `src/components`: interface de produtos, carrinho e área de pagamento
- `src/context/CartContext.tsx`: estado global do carrinho
- `server/index.js`: backend local

## Observações

- Não alterar `.env.local` automaticamente.
- Qualquer mudança de banco deve ser feita por migration versionada.
- Deploy em produção só com confirmação.
