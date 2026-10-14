import { useCallback, useEffect, useRef, useState } from 'react'
import { getSessionContext, isSessionCurrent } from '../services/sessionContext'

/*
 * Mantém os pedidos ligados à identidade que montou a página.
 * O controller é recriado no efeito para suportar o replay do StrictMode.
 */
export default function useSessionRequest() {
  const [generation] = useState(() => getSessionContext().generation)
  const contextRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    contextRef.current = { generation, signal: controller.signal }

    return () => {
      controller.abort()
      contextRef.current = null
    }
  }, [generation])

  return useCallback(() => {
    const context = contextRef.current
    return context && isSessionCurrent(context) ? context : null
  }, [])
}
