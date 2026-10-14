const channelName = 'aspec-session'

function openChannel() {
  return typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function'
    ? new window.BroadcastChannel(channelName)
    : null
}

// Só comunica uma mudança de sessão, nunca identidade ou credenciais.
export function notifySessionChange(type) {
  const channel = openChannel()
  channel?.postMessage(type)
  channel?.close()
}

export function listenSessionChanges(onChange) {
  const channel = openChannel()
  if (channel) channel.onmessage = ({ data }) => {
    if (data === 'changing' || data === 'changed') onChange(data)
  }
  return () => channel?.close()
}
