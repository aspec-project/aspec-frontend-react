import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Função estável para mudar os parâmetros do endereço a partir de respostas assíncronas (ex.: corrigir uma
 * página que deixou de existir). O `setSearchParams` do React Router muda a cada mudança do endereço e a forma
 * funcional parte dos parâmetros do render em que foi criado; esta função usa sempre a versão mais recente,
 * sem obrigar os efeitos que a usam a repetir pedidos quando outra lista muda o endereço.
 *
 * @returns {(updater: (current: URLSearchParams) => URLSearchParams, options?: {replace?: boolean}) => void}
 */
export default function useSearchParamsUpdater() {
  const [, setSearchParams] = useSearchParams()
  const latest = useRef(setSearchParams)

  useEffect(() => {
    latest.current = setSearchParams
  }, [setSearchParams])

  return useCallback((updater, options) => latest.current(updater, options), [])
}
