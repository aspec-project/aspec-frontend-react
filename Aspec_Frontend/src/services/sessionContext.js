let generation = 0
let controller = new AbortController()

// O contexto é só local: nunca contém tokens nem substitui a autorização da API.
export function getSessionContext() {
  return { generation, signal: controller.signal }
}

export function isSessionCurrent(context) {
  return context.generation === generation && !context.signal.aborted
}

export function advanceSession() {
  const previousController = controller
  generation += 1
  controller = new AbortController()
  previousController.abort()
  return getSessionContext()
}
