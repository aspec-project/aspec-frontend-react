import { getCategoryBadgeColors } from '../../../utils/eventCategories'

/**
 * Badge com o nome de um tipo de evento, tingido na cor do tipo (fundo claro e texto escuro na mesma cor, com
 * contraste AA). Uma cor inválida usa o azul-marinho e nunca chega ao `style`.
 *
 * @param {{name: string, color: unknown}} props
 * @returns {JSX.Element}
 */
export default function CategoryBadge({ name, color }) {
  const { background, text } = getCategoryBadgeColors(color)

  return (
    <span className="rounded-full px-2.5 py-0.5 text-sm font-medium" style={{ backgroundColor: background, color: text }}>
      {name}
    </span>
  )
}
