# React + Vite

## Agenda e contrato da API

A agenda obtém apenas uma página por pedido em `/api/events`, combinando
`search`, `category_id` e `location_id`, com `per_page=9` e metadados de paginação
do backend. A pesquisa textual está ativa sem flags de configuração.
O diretório usa a mesma abordagem server-side com `per_page=12`.

Descrição, cor da categoria e ocupação são apresentadas apenas quando a API
devolver os campos válidos `description`, `category.color`, `max_attendees` e
`registrations_count`. Não se obtém o detalhe individual para completar cada card.
A API conta as inscrições existentes em `registrations_count`; não existe um
estado separado `confirmed`. A barra limita a percentagem visual a 100% e
apresenta um estado indisponível se a contagem ou capacidade não forem válidas.

Setores, distritos e categorias públicas partilham uma cache em memória de cinco
minutos e pedidos em curso. Cada consumidor pode cancelar a sua espera; só se
cancela o transporte quando não restam consumidores, após o remount imediato
do StrictMode. Erros não ficam em cache. Eventos, membros e dados privados não
são guardados nesta cache.

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
