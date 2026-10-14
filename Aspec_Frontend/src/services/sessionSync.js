const channelName = 'aspec-session'
/* Não usar sessionStorage: duplicar um separador pode copiar esse armazenamento. */
const tabId = globalThis.crypto.randomUUID()
const listeners = new Set()
let channel = null
let clock = 0
let latest = null
let completed = false

function compare(a, b) {
  return a.sessionVersion - b.sessionVersion ||
    (a.sourceTabId === b.sourceTabId ? 0 : a.sourceTabId > b.sourceTabId ? 1 : -1)
}

function openChannel() {
  if (!channel && typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
    channel = new window.BroadcastChannel(channelName)
    channel.onmessage = ({ data }) => {
      if (!data || !['changing', 'changed', 'logged-out'].includes(data.type) ||
          typeof data.sourceTabId !== 'string' || !data.sourceTabId || data.sourceTabId === tabId ||
          !Number.isSafeInteger(data.sessionVersion) || data.sessionVersion < 1) return
      clock = Math.max(clock, data.sessionVersion)
      const order = latest ? compare(data, latest) : 1
      /* A conclusão pertence à transição que a iniciou; duplicados não geram pedidos. */
      if (order < 0 || (order === 0 && (completed || data.type === 'changing'))) return
      latest = data
      completed = data.type !== 'changing'
      for (const listener of listeners) listener(data.type)
    }
  }
  return channel
}

/* Só comunica mudanças, nunca identidade ou credenciais. /auth/me é a autoridade. */
export function notifySessionChange(type, transition) {
  if (!['changing', 'changed', 'logged-out'].includes(type)) return
  const message = transition
    ? { ...transition, type }
    : { type, sourceTabId: tabId, sessionVersion: ++clock }
  if (transition && latest && compare(message, latest) !== 0) return
  latest = message
  completed = type !== 'changing'
  openChannel()?.postMessage(message)
  return message
}

export function listenSessionChanges(onChange) {
  listeners.add(onChange)
  openChannel()
  return () => {
    listeners.delete(onChange)
    if (!listeners.size) {
      channel?.close()
      channel = null
    }
  }
}
