import { Lock, Pencil, Trash2 } from 'lucide-react'
import CategoryBadge from './CategoryBadge'
import {
  EVENT_CATEGORY_TEXTS,
  canDeleteCategory,
  formatEventsCount,
  getCategoryBadgeColors,
  getDeleteLabel,
  getEditLabel,
  getLockedLabel,
} from '../../../utils/eventCategories'
import { isHexColor } from '../../../utils/color'

const buttonBase = 'flex h-8 w-8 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Tabela dos tipos de evento, pela ordem do backend: tipo (bolinha na cor, badge tingido e código hex),
 * número de eventos e ações. Todos se editam; só os tipos sem eventos se apagam, os outros mostram um cadeado
 * com a explicação (lido pelos leitores de ecrã). Enquanto a lista recarrega fica ocupada.
 *
 * @param {{
 *   categories: object[],
 *   busy?: boolean,
 *   onEdit: (category: object) => void,
 *   onDelete: (category: object) => void,
 *   actionsDisabled?: boolean,
 * }} props
 * @returns {JSX.Element}
 */
export default function EventCategoriesTable({ categories, busy = false, onEdit, onDelete, actionsDisabled = false }) {
  return (
    <div aria-busy={busy} className={`overflow-x-auto rounded-xl bg-white shadow-sm transition-opacity ${busy ? 'opacity-60' : ''}`}>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{EVENT_CATEGORY_TEXTS.tableCaption}</caption>
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Tipo</th>
            <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Eventos</th>
            <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {categories.map((category) => {
            const { color } = getCategoryBadgeColors(category.color)
            const deletable = canDeleteCategory(category)

            return (
              <tr key={category.id}>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: color }} />
                    <CategoryBadge name={category.name} color={category.color} />
                    <span className="font-mono text-xs text-gray-400">{isHexColor(category.color) ? category.color.toUpperCase() : '—'}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-right text-gray-700">{formatEventsCount(category.events_count)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      aria-label={getEditLabel(category.name)}
                      title="Editar"
                      aria-haspopup="dialog"
                      disabled={actionsDisabled}
                      onClick={() => onEdit(category)}
                      className={`${buttonBase} bg-[#f5efe3] text-[#8a7043] hover:bg-[#ede3cf]`}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    {deletable ? (
                      <button
                        type="button"
                        aria-label={getDeleteLabel(category.name)}
                        title="Apagar"
                        aria-haspopup="dialog"
                        disabled={actionsDisabled}
                        onClick={() => onDelete(category)}
                        className={`${buttonBase} bg-red-50 text-red-600 hover:bg-red-100`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    ) : (
                      <span
                        role="img"
                        aria-label={getLockedLabel(category)}
                        title={getLockedLabel(category)}
                        className="flex h-8 w-8 items-center justify-center text-gray-300"
                      >
                        <Lock size={16} aria-hidden="true" />
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
