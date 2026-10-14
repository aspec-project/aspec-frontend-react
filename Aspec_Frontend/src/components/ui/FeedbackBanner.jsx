import { CircleCheck, CircleX, X } from 'lucide-react'

/**
 * Mensagem de resultado de uma ação. O sucesso é anunciado como estado e o erro como alerta;
 * não desaparece sozinha, fecha-se com o botão.
 *
 * @param {{type: 'success'|'error', message: string, onClose: () => void}} props
 * @returns {JSX.Element}
 */
export default function FeedbackBanner({ type, message, onClose }) {
  const isError = type === 'error'
  const Icon = isError ? CircleX : CircleCheck

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-start justify-between gap-4 rounded-xl border p-4 text-sm ${isError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
        <p>{message}</p>
      </div>
      <button
        type="button"
        aria-label="Fechar mensagem"
        onClick={onClose}
        className="shrink-0 rounded-md p-0.5 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79]"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
