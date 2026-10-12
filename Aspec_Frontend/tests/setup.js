/*
 * Disponibiliza os matchers de DOM e limpa os elementos renderizados
 * entre testes para que cada caso seja executado isoladamente.
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
