# React + Vite

## Agenda e contrato da API

A agenda obtém apenas uma página por pedido em `/api/events`, combinando
`category_id` e `location_id` e usando os metadados de paginação do backend.

As configurações seguintes estão desativadas por omissão:

- `VITE_EVENTS_SEARCH_ENABLED=true` ativa a pesquisa e envia `search` ao backend.
- `VITE_EVENTS_PER_PAGE_ENABLED=true` envia `per_page=10`. Respostas com um limite
  superior a dez são rejeitadas; os resultados não são cortados no frontend.

Estes parâmetros ainda não constam do contrato Postman atual. As opções só devem
ser ativadas depois de o backend confirmar o respetivo suporte. Com as opções
desativadas, a pesquisa fica indisponível e a agenda respeita a paginação recebida,
cujo exemplo atual utiliza quinze resultados por página.

Descrição, cor da categoria e ocupação são apresentadas apenas quando a API
devolver os campos válidos `description`, `category.color`, `max_attendees` e
`registrations_count`. Não se obtém o detalhe individual para completar cada card.
Estes campos opcionais também aguardam confirmação no contrato da listagem.

A homepage mantém a consulta existente de todas as páginas para selecionar os
três eventos futuros mais próximos. A sua otimização depende de o backend
confirmar a ordenação completa ou um mecanismo para obter só esses eventos.

## Testes do frontend

Todos os testes partilhados ficam na pasta `tests/`, organizados por componente.
O ficheiro `tests/setup.js` configura os matchers de DOM e a limpeza entre testes.

Depois de obter o projeto, executa os comandos na pasta `Aspec_Frontend`:

```sh
npm ci
npm test
```

Para executar os testes automaticamente quando os ficheiros mudam:

```sh
npm run test:watch
```

Os novos testes devem ter o nome `*.test.jsx` ou `*.test.js` e usar importações
relativas aos componentes em `src/`. A configuração também aceita ficheiros
`*.spec.*` e testes em TypeScript.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
