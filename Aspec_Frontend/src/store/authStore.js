import { create } from 'zustand'
import { api, ensureCsrfCookie, normalizeError } from '../services/api'
import { advanceSession, getSessionContext, isSessionCurrent } from '../services/sessionContext'
import { notifySessionChange } from '../services/sessionSync'

function changeSession(set) {
  const context = advanceSession()
  set({ sessionGeneration: context.generation })
  return context
}

function authenticatedUser(set, user) {
  set({ user, role: user.role ?? null, status: 'authenticated', sessionChanging: false, error: null, logoutError: null })
}

const cancelledResult = () => ({ success: false, cancelled: true })

export const useAuthStore = create((set, get) => ({
  user: null,
  role: null,
  status: 'loading',
  error: null,
  logoutError: null,
  sessionChanging: false,
  sessionGeneration: getSessionContext().generation,
  isAuthenticated: () => !!get().user,

  fetchUser: async () => {
    // Não restaurar a sessão enquanto se tenta confirmar o logout no servidor.
    if (get().sessionChanging || get().status === 'logging-out' || get().logoutError) return cancelledResult()
    const context = getSessionContext()
    try {
      const response = await api.get('/auth/me', {
        skipAuthRedirect: true,
        sessionGeneration: context.generation,
        signal: context.signal,
      })
      if (!isSessionCurrent(context)) return cancelledResult()
      const user = response.data.data
      authenticatedUser(set, user)
      return { success: true, user }
    } catch (error) {
      if (!isSessionCurrent(context)) return cancelledResult()
      get().clearSession()
      return { success: false, error: normalizeError(error) }
    }
  },

  initialize: async () => get().fetchUser(),

  receiveSessionChange: (type) => {
    /* Nunca republicar eventos recebidos. A identidade só vem do backend. */
    get().clearSession()
    if (type === 'changing') set({ sessionChanging: true })
    if (type === 'changed') {
      set({ status: 'loading' })
      return get().initialize()
    }
  },

  login: async (email, password) => {
    // Limpa a identidade anterior antes de começar outra autenticação.
    changeSession(set)
    set({ user: null, role: null, status: 'loading', sessionChanging: true, error: null, logoutError: null })
    const context = getSessionContext()
    const transition = notifySessionChange('changing')
    let settled = false
    try {
      await ensureCsrfCookie(context)
      if (!isSessionCurrent(context)) return cancelledResult()
      const response = await api.post('/auth/login', { email, password }, {
        skipAuthRedirect: true,
        sessionGeneration: context.generation,
        signal: context.signal,
      })
      if (!isSessionCurrent(context)) return cancelledResult()
      settled = true
      authenticatedUser(set, response.data.data)
      return { success: true }
    } catch (error) {
      if (!isSessionCurrent(context)) return cancelledResult()
      const normalized = normalizeError(error)
      set({ user: null, role: null, status: 'error', sessionChanging: false, error: normalized.message })
      /* O servidor pode conservar a sessão anterior num login recusado, ou ter
       * concluído o login apesar de uma falha de rede. Reconciliar também o emissor. */
      const reconciled = await get().fetchUser()
      if (reconciled.cancelled) return cancelledResult()
      settled = true
      if (!get().user) set({ status: 'error', error: normalized.message })
      return { success: false, error: normalized }
    } finally {
      if (settled) notifySessionChange('changed', transition)
    }
  },

  logout: async () => {
    if (get().status === 'logging-out') return cancelledResult()
    const context = changeSession(set)
    set({ status: 'logging-out', sessionChanging: true, logoutError: null })
    const transition = notifySessionChange('changing')
    let settled = false
    let loggedOut = false
    try {
      await api.post('/auth/logout', undefined, {
        skipAuthRedirect: true,
        sessionGeneration: context.generation,
        signal: context.signal,
      })
      if (!isSessionCurrent(context)) return cancelledResult()
      settled = true
      loggedOut = true
      get().clearSession()
      return { success: true }
    } catch (error) {
      if (!isSessionCurrent(context)) return cancelledResult()
      settled = true
      if (error.response?.status === 401) {
        loggedOut = true
        get().clearSession()
        return { success: true }
      }
      const message = 'Não foi possível terminar a sessão no servidor. Tente novamente.'
      set({ status: get().user ? 'authenticated' : 'idle', sessionChanging: false, logoutError: message })
      return { success: false, error: { ...normalizeError(error), message } }
    } finally {
      if (settled) notifySessionChange(loggedOut ? 'logged-out' : 'changed', transition)
    }
  },

  clearSession: ({ broadcast = false } = {}) => {
    changeSession(set)
    set({ user: null, role: null, status: 'idle', sessionChanging: false, error: null, logoutError: null })
    if (broadcast) notifySessionChange('logged-out')
  },
}))

// Mudanças de identidade invalidam os pedidos anteriores. Atualizações de
// campos do mesmo utilizador não desmontam os seus formulários.
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id ||
      state.user?.role?.name !== previous.user?.role?.name ||
      state.user?.account_status?.name !== previous.user?.account_status?.name) {
    const context = advanceSession()
    useAuthStore.setState({ sessionGeneration: context.generation })
  }
})
