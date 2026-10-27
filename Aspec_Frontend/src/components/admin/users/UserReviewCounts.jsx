import { useId } from 'react'
import { EyeOff, Flag } from 'lucide-react'

const COUNT_KEYS = ['total', 'hidden', 'flagged']

/**
 * Indica se as contagens de um lado (recebidas ou feitas) têm a forma esperada: inteiros seguros ≥ 0.
 *
 * @param {unknown} side Objeto {total, hidden, flagged} vindo da API.
 * @returns {boolean}
 */
function isValidSide(side) {
  return Boolean(side) && typeof side === 'object'
    && COUNT_KEYS.every((key) => Number.isSafeInteger(side[key]) && side[key] >= 0)
}

/**
 * Grupo de três mosaicos (Total, Ocultas, Sinalizadas), anunciado com o nome do subtítulo.
 *
 * @param {{title: string, counts: {total: number, hidden: number, flagged: number}}} props
 * @returns {JSX.Element}
 */
function CountsGroup({ title, counts }) {
  const id = useId()
  const tiles = [
    { label: 'Total', value: counts.total },
    { label: 'Ocultas', value: counts.hidden, Icon: EyeOff },
    { label: 'Sinalizadas', value: counts.flagged, Icon: Flag, valueClass: 'text-[#8a7043]' },
  ]

  return (
    <div role="group" aria-labelledby={id}>
      <h3 id={id} className="text-xs text-gray-500">{title}</h3>
      <dl className="mt-2 grid grid-cols-3 gap-3">
        {tiles.map(({ label, value, Icon, valueClass = 'text-[#0d1f35]' }) => (
          <div key={label} className="rounded-lg bg-[#f5f5f4] p-3">
            <dt className="flex items-center gap-1 text-xs text-gray-500">
              {Icon && <Icon size={12} aria-hidden="true" />}
              {label}
            </dt>
            <dd className={`mt-1 text-lg font-semibold ${valueClass}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/**
 * Contagens de avaliações de um membro: no seu perfil (recebidas) e feitas a outros membros.
 * Se a API não enviar `review_counts` com a forma esperada, avisa que ainda não estão disponíveis
 * (em vez de mostrar zeros, que seriam dados falsos).
 *
 * @param {{counts?: {received?: object, given?: object}|null}} props
 * @returns {JSX.Element}
 */
export default function UserReviewCounts({ counts }) {
  if (!counts || !isValidSide(counts.received) || !isValidSide(counts.given)) {
    return <p className="mt-4 text-sm text-gray-600">As contagens de avaliações ainda não estão disponíveis.</p>
  }

  return (
    <div className="mt-4 space-y-4">
      <CountsGroup title="No perfil do membro" counts={counts.received} />
      <CountsGroup title="Feitas a outros membros" counts={counts.given} />
    </div>
  )
}
