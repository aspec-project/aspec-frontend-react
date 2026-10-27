import { Eye, EyeOff } from 'lucide-react'

/**
 * Botão de alternar que mostra ou esconde os administradores na lista de utilizadores.
 *
 * @param {{pressed: boolean, onToggle: () => void}} props
 * @returns {JSX.Element}
 */
export default function ShowAdminsToggle({ pressed, onToggle }) {
  const Icon = pressed ? Eye : EyeOff

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label="Ver admins"
      title={pressed ? 'Esconder admins' : 'Mostrar admins'}
      onClick={onToggle}
      className={`flex items-center justify-center rounded-lg border p-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] ${pressed ? 'border-[#0d1f35] bg-[#0d1f35] text-white' : 'border-gray-200 bg-white text-[#0d1f35] hover:border-[#0d1f35]'}`}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  )
}
