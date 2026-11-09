import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ConfirmDialog from '../ui/ConfirmDialog'
import SelectMenu from '../ui/SelectMenu'
import { MEMBER_REVIEW_REPORT_REASONS, reportMemberReview } from '../../services/members'
import { normalizeError } from '../../services/api'
import { getSessionContext, isSessionCurrent } from '../../services/sessionContext'
import { useAuthStore } from '../../store/authStore'
import { canReportReviews } from '../../utils/memberAccess'

const fallbackMessages = {
  401: 'A sessão terminou. Entre novamente para sinalizar.',
  403: 'Não tem permissão para sinalizar esta avaliação.',
  404: 'A avaliação já não está disponível.',
  409: 'Não foi possível sinalizar esta avaliação. Pode já estar sinalizada ou indisponível.',
  419: 'A sessão expirou. Atualize a página e tente novamente.',
  422: 'Verifique os campos da sinalização.',
  429: 'Demasiados pedidos. Tente novamente mais tarde.',
}

export default function ReportReviewDialog({ review, onClose, onReported }) {
  const id = useId()
  const portalRef = useRef(null)
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const requestRef = useRef(null)
  const user = useAuthStore((state) => state.user)
  const status = useAuthStore((state) => state.status)
  const generation = useAuthStore((state) => state.sessionGeneration)
  const sessionChanging = useAuthStore((state) => state.sessionChanging)
  const [origin] = useState(() => ({ user, generation, reviewId: review.id, context: getSessionContext() }))
  const eligible = user === origin.user && generation === origin.generation && review.id === origin.reviewId &&
    status === 'authenticated' && !sessionChanging && canReportReviews(user) &&
    review.is_mine === false && isSessionCurrent(origin.context)
  const validReason = MEMBER_REVIEW_REPORT_REASONS.some((option) => option.value === reason)
  const commentLength = [...comment].length
  const commentError = errors.comment || (commentLength > 2000 ? 'O comentário não pode exceder 2000 caracteres.' : '')

  useEffect(() => () => requestRef.current?.abort(), [user, status, generation, sessionChanging, review.id])

  async function submit() {
    if (requestRef.current) return
    const auth = useAuthStore.getState()
    if (!eligible || !isSessionCurrent(origin.context) || auth.user !== origin.user || auth.sessionGeneration !== origin.generation ||
      auth.status !== 'authenticated' || auth.sessionChanging || !canReportReviews(auth.user) ||
      review.is_mine !== false) return
    const fields = {}
    if (!validReason) fields.reason = 'Selecione um motivo.'
    if (commentLength > 2000) fields.comment = 'O comentário não pode exceder 2000 caracteres.'
    setErrors(fields)
    setError('')
    if (Object.keys(fields).length) return
    const controller = new AbortController()
    const context = origin.context
    requestRef.current = controller
    setPending(true)
    const current = () => !controller.signal.aborted && isSessionCurrent(context) &&
      useAuthStore.getState().user === origin.user && useAuthStore.getState().sessionGeneration === origin.generation &&
      useAuthStore.getState().status === 'authenticated' && !useAuthStore.getState().sessionChanging &&
      canReportReviews(useAuthStore.getState().user)
    try {
      const result = await reportMemberReview(review.id, { reason, comment: comment.trim() || null }, AbortSignal.any([controller.signal, context.signal]))
      if (current()) onReported?.(result)
    } catch (requestError) {
      if (!current()) return
      const normalized = normalizeError(requestError)
      const fields = {}
      for (const field of ['reason', 'comment']) {
        if (typeof normalized.fieldErrors[field] === 'string') fields[field] = normalized.fieldErrors[field]
      }
      setErrors(fields)
      const apiMessage = requestError.response?.data?.message
      setError(typeof apiMessage === 'string' && apiMessage.trim() ? normalized.message : fallbackMessages[normalized.status] ??
        (normalized.status ? 'Não foi possível enviar a sinalização. Tente novamente.' : 'Não foi possível contactar o servidor. Tente novamente.'))
    } finally {
      if (requestRef.current === controller) requestRef.current = null
      if (current()) setPending(false)
    }
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const background = Array.from(document.body.children)
      .filter((element) => element !== portalRef.current)
      .map((element) => ({ element, inert: element.inert }))
    document.body.style.overflow = 'hidden'
    background.forEach(({ element }) => { element.inert = true })
    return () => {
      document.body.style.overflow = previousOverflow
      background.forEach(({ element, inert }) => { element.inert = inert })
    }
  }, [])

  return createPortal(
    <div ref={portalRef} className="contents">
      <ConfirmDialog
        open
        title="Sinalizar avaliação"
        description={<span className="break-words [overflow-wrap:anywhere]">Avaliação de {review.reviewer.business_name}.</span>}
        confirmLabel="Enviar sinalização"
        confirmDisabled={!eligible || !validReason || commentLength > 2000}
        pending={pending}
        onConfirm={submit}
        cancelLabel="Cancelar"
        onCancel={() => { if (!requestRef.current) onClose() }}
        showClose
      >
        <div className="space-y-4 pt-4">
          <SelectMenu
            id={`${id}-reason`}
            label="Motivo"
            value={reason}
            placeholder="Selecione um motivo"
            options={MEMBER_REVIEW_REPORT_REASONS}
            onChange={setReason}
            required
            disabled={pending}
            invalid={!!errors.reason}
            describedBy={errors.reason ? `${id}-reason-error` : undefined}
          />
          {errors.reason && <p id={`${id}-reason-error`} className="text-xs text-red-700">{errors.reason}</p>}
          <div>
            <label htmlFor={`${id}-comment`} className="mb-1 block text-xs font-medium text-gray-600">Comentário (opcional)</label>
            <textarea
              id={`${id}-comment`}
              rows={3}
              disabled={pending}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              aria-invalid={!!commentError}
              aria-describedby={commentError ? `${id}-comment-error` : undefined}
              className={`block w-full resize-y rounded-lg border px-3 py-2 text-sm text-[#0d1f35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] ${commentError ? 'border-red-400' : 'border-gray-200'}`}
            />
            {commentError && <p id={`${id}-comment-error`} className="mt-1 text-xs text-red-700">{commentError}</p>}
          </div>
          {!eligible && <p role="alert" className="text-sm text-red-700">A sessão já não permite sinalizar esta avaliação.</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
      </ConfirmDialog>
    </div>,
    document.body,
  )
}
