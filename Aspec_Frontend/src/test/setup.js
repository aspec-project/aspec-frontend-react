// Matchers extra para o DOM (ex.: toBeInTheDocument) e limpeza do DOM entre testes
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
