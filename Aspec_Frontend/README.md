# React + Vite

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
