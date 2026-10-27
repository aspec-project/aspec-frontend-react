/*
 * Disponibiliza os matchers de DOM e limpa os elementos renderizados
 * entre testes para que cada caso seja executado isoladamente.
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { clearPublicReferenceCache } from '../src/services/publicReferenceCache'

beforeEach(() => {
  clearPublicReferenceCache()
})

afterEach(() => {
  cleanup()
})
