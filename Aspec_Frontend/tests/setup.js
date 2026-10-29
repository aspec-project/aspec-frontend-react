/*
 * Disponibiliza os matchers de DOM e limpa os elementos renderizados
 * entre testes para que cada caso seja executado isoladamente.
 * A chave do Google Maps do `.env` local fica vazia em todos os testes.
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { clearPublicReferenceCache } from '../src/services/publicReferenceCache'

beforeEach(() => {
  clearPublicReferenceCache()
  vi.stubEnv('VITE_GOOGLE_MAPS_EMBED_KEY', '')
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})
