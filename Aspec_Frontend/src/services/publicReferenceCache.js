import { CanceledError } from 'axios'
import { api } from './api'

const entries = new Map()
const lifetime = 5 * 60 * 1000
const publicEndpoints = new Set(['/sectors', '/locations', '/event-categories'])
const clone = (items) => items.map((item) => ({ ...item }))

function validate(body, message) {
  if (
    body?.success !== true ||
    !Array.isArray(body.data) ||
    body.data.some((item) => typeof item?.id !== 'string' || !item.id.trim() ||
      typeof item.name !== 'string' || !item.name.trim()) ||
    new Set(body.data.map((item) => item.id)).size !== body.data.length
  ) throw new Error(message)

  return body.data.map(({ id, name }) => ({ id, name }))
}

/*
 * Apenas estas referências públicas são partilhadas. Cada consumidor mantém
 * o seu cancelamento sem interromper os restantes consumidores do pedido.
 */
export function getCachedPublicReferenceList(endpoint, signal, message) {
  if (!publicEndpoints.has(endpoint)) return Promise.reject(new Error('Referência pública desconhecida.'))
  if (signal?.aborted) return Promise.reject(new CanceledError())

  let entry = entries.get(endpoint)
  if (entry?.items && entry.expires > Date.now()) return Promise.resolve(clone(entry.items))

  if (!entry || entry.items) {
    entry = { controller: new AbortController(), consumers: new Set() }
    entries.set(endpoint, entry)
    entry.promise = api.get(endpoint, { signal: entry.controller.signal, skipAuthRedirect: true })
      .then((response) => {
        const items = validate(response.data, message)
        if (entry.controller.signal.aborted) throw new CanceledError()
        if (entries.get(endpoint) === entry) {
          entry.items = items
          entry.expires = Date.now() + lifetime
        }
        return items
      })
      .catch((error) => {
        if (entries.get(endpoint) === entry) entries.delete(endpoint)
        throw error
      })
  }

  return new Promise((resolve, reject) => {
    const consumer = { cancel: () => finish(reject, new CanceledError()) }
    let finished = false
    function finish(settle, value) {
      if (finished) return
      finished = true
      signal?.removeEventListener('abort', consumer.cancel)
      entry.consumers.delete(consumer)
      settle(value)
    }
    consumer.cancel = () => {
      finish(reject, new CanceledError())
      /*
       * O remount síncrono do StrictMode pode reutilizar o pedido antes
       * de cancelar o transporte quando já não existem consumidores.
       */
      queueMicrotask(() => {
        if (!entry.items && entry.consumers.size === 0) {
          if (entries.get(endpoint) === entry) entries.delete(endpoint)
          entry.controller.abort()
        }
      })
    }
    entry.consumers.add(consumer)
    signal?.addEventListener('abort', consumer.cancel, { once: true })
    entry.promise.then(
      (items) => finish(resolve, clone(items)),
      (error) => finish(reject, error),
    )
  })
}

export function clearPublicReferenceCache() {
  for (const entry of entries.values()) {
    for (const consumer of [...entry.consumers]) consumer.cancel()
    entry.controller.abort()
  }
  entries.clear()
}
