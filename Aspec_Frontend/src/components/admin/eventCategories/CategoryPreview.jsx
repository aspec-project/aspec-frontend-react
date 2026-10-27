import CategoryBadge from './CategoryBadge'
import { EVENT_CATEGORY_TEXTS } from '../../../utils/eventCategories'

/**
 * Pré-visualização de um tipo de evento no diálogo: faixa na cor escolhida, o badge com o nome (ou "Nome do
 * tipo" enquanto está vazio) e o código hexadecimal. Recebe sempre uma cor válida (a do seletor).
 *
 * @param {{name: string, color: string}} props
 * @returns {JSX.Element}
 */
export default function CategoryPreview({ name, color }) {
  const label = name.trim() === '' ? EVENT_CATEGORY_TEXTS.previewPlaceholder : name.trim()

  return (
    <div>
      <p className="mb-1 block text-sm font-medium text-gray-700">{EVENT_CATEGORY_TEXTS.previewLabel}</p>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="h-2" style={{ backgroundColor: color }} />
        <div className="p-4">
          <CategoryBadge name={label} color={color} />
          <p className="mt-3 font-mono text-xs text-gray-500">{color}</p>
        </div>
      </div>
    </div>
  )
}
