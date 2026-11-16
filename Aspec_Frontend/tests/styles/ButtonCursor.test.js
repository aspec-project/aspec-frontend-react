import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * O jsdom não aplica o CSS do Tailwind, por isso confirma-se a regra no ficheiro (ASPEC-463):
 * o Tailwind 4 deixou de pôr o cursor de mão nos botões.
 */
describe('Cursor dos botões', () => {
  const css = readFileSync(resolve(__dirname, '../../src/index.css'), 'utf8').replace(/\s+/g, ' ')

  it('botões ativos mostram a mão', () => {
    expect(css).toContain('button:not(:disabled), [role="button"]:not([aria-disabled="true"]) { cursor: pointer; }')
  })

  it('botões desativados mostram o cursor de não permitido', () => {
    expect(css).toContain('button:disabled, [role="button"][aria-disabled="true"] { cursor: not-allowed; }')
  })
})
