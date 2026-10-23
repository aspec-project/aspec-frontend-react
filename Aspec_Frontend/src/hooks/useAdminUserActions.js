import { useRef, useState } from 'react'
import axios from 'axios'
import { normalizeError } from '../services/api'
import {
  anonymizeUser,
  approveUser,
  blockUser,
  demoteUser,
  promoteUser,
  rejectUser,
  sendPaymentLink,
  unblockUser,
} from '../services/adminUsers'

const ACTION_SERVICES = {
  approve: approveUser,
  reject: rejectUser,
  block: blockUser,
  unblock: unblockUser,
  promote: promoteUser,
  demote: demoteUser,
  paymentLink: sendPaymentLink,
  anonymize: anonymizeUser,
}

const REMOVING_ACTIONS = ['anonymize']

/**
 * Ciclo das ações de administração sobre um utilizador: pedir confirmação, executar e mostrar o resultado.
 * Nas ações que apagam a conta (anonimizar), se houver `onRemoved`, o sucesso é entregue à página
 * (que sai do detalhe) em vez de mostrar a mensagem e recarregar.
 *
 * @param {{
 *   onChanged: () => void,
 *   onRemoved?: (message: string) => void,
 *   initialFeedback?: {type: 'success'|'error', message: string}|null,
 * }} options onChanged recarrega os dados depois de a ação os mudar; onRemoved recebe a mensagem
 *   da API quando a conta deixa de existir; initialFeedback é a mensagem a mostrar ao abrir.
 * @returns {{
 *   confirming: {action: string, user: object}|null,
 *   pending: boolean,
 *   feedback: {type: 'success'|'error', message: string}|null,
 *   requestAction: (action: string, user: object) => void,
 *   cancel: () => void,
 *   confirm: () => Promise<void>,
 *   dismissFeedback: () => void,
 * }}
 */
export default function useAdminUserActions({ onChanged, onRemoved, initialFeedback = null }) {
  const [confirming, setConfirming] = useState(null)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(initialFeedback)
  const pendingRef = useRef(false)

  /**
   * Abre a confirmação de uma ação sobre um utilizador.
   *
   * @param {string} action Chave da ação (approve, reject, block, unblock, promote, demote, paymentLink, anonymize).
   * @param {object} user Utilizador da linha.
   */
  const requestAction = (action, user) => {
    if (pendingRef.current) return
    setConfirming({ action, user })
  }

  /**
   * Fecha a confirmação sem executar a ação.
   */
  const cancel = () => {
    if (pendingRef.current) return
    setConfirming(null)
  }

  /**
   * Executa a ação confirmada e guarda a mensagem da API como resultado.
   *
   * @returns {Promise<void>}
   */
  const confirm = async () => {
    if (!confirming || pendingRef.current) return

    pendingRef.current = true
    setPending(true)
    setFeedback(null)

    try {
      const { message } = await ACTION_SERVICES[confirming.action](confirming.user.id)

      if (onRemoved && REMOVING_ACTIONS.includes(confirming.action)) {
        onRemoved(message)
      } else {
        setFeedback({ type: 'success', message })
        onChanged()
      }
    } catch (err) {
      if (!axios.isCancel(err)) {
        const { status, message } = normalizeError(err)
        setFeedback({ type: 'error', message })

        // 409/404: outro admin mudou o utilizador entretanto, por isso a linha está desatualizada.
        if (status === 409 || status === 404) {
          onChanged()
        }
      }
    } finally {
      pendingRef.current = false
      setPending(false)
      setConfirming(null)
    }
  }

  return {
    confirming,
    pending,
    feedback,
    requestAction,
    cancel,
    confirm,
    dismissFeedback: () => setFeedback(null),
  }
}
