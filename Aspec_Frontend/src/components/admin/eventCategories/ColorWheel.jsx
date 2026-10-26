import { useRef } from 'react'
import { X } from 'lucide-react'
import { hexToRgb, hsToWheelPercent, hsvToHex, rgbToHsv, wheelPointToHs } from '../../../utils/color'
import { EVENT_CATEGORY_TEXTS, getUsedColorLabel } from '../../../utils/eventCategories'
import { badgeTextColor } from '../../../utils/eventFormatting'

const WHEEL_BACKGROUND = 'radial-gradient(circle closest-side, #FFFFFF, rgba(255,255,255,0)), conic-gradient(from 0deg, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)'

/**
 * Roda de cores (matiz à volta, saturação do centro para a borda) desenhada com gradientes CSS. Arrastar ou
 * clicar escolhe a cor; ←/→ mudam a matiz e ↑/↓ a saturação (com Shift, passos de 10). As cores já usadas por
 * outros tipos aparecem marcadas com uma cruz, cada uma com o nome do tipo para leitores de ecrã.
 *
 * @param {{
 *   hsv: {h: number, s: number, v: number},
 *   usedColors: {id: string, name: string, color: string}[],
 *   onChange: (hs: {h: number, s: number}) => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function ColorWheel({ hsv, usedColors, onChange }) {
  const draggingRef = useRef(false)
  const color = hsvToHex(hsv)
  const handle = hsToWheelPercent(hsv)
  const hue = Math.round(hsv.h) % 360
  const saturation = Math.round(hsv.s * 100)

  /**
   * Calcula a matiz e a saturação do ponto do ponteiro em relação ao centro da roda. No centro exato mantém
   * a matiz atual.
   *
   * @param {import('react').PointerEvent<HTMLDivElement>} event
   */
  const pickFromPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const radius = rect.width / 2
    const { h, s } = wheelPointToHs(event.clientX - (rect.left + radius), event.clientY - (rect.top + rect.height / 2), radius)

    onChange({ h: h ?? hsv.h, s })
  }

  /**
   * Começa o arrasto e escolhe logo a cor do ponto carregado.
   *
   * @param {import('react').PointerEvent<HTMLDivElement>} event
   */
  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    draggingRef.current = true
    pickFromPointer(event)
  }

  /**
   * Durante o arrasto, acompanha o ponteiro.
   *
   * @param {import('react').PointerEvent<HTMLDivElement>} event
   */
  const handlePointerMove = (event) => {
    if (draggingRef.current) pickFromPointer(event)
  }

  /**
   * Termina o arrasto.
   *
   * @param {import('react').PointerEvent<HTMLDivElement>} event
   */
  const handlePointerEnd = (event) => {
    draggingRef.current = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  /**
   * Setas: ←/→ mudam a matiz (dá a volta 359 ↔ 0) e ↑/↓ a saturação (limitada a 0–100 %); com Shift, passos
   * de 10. Impede o scroll da página.
   *
   * @param {import('react').KeyboardEvent<HTMLDivElement>} event
   */
  const handleKeyDown = (event) => {
    const step = event.shiftKey ? 10 : 1

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const delta = event.key === 'ArrowRight' ? step : -step
      onChange({ h: (((hsv.h + delta) % 360) + 360) % 360, s: hsv.s })
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const delta = (event.key === 'ArrowUp' ? step : -step) / 100
      onChange({ h: hsv.h, s: Math.min(1, Math.max(0, hsv.s + delta)) })
    }
  }

  return (
    <div className="relative h-48 w-48 shrink-0">
      <div
        role="slider"
        tabIndex={0}
        aria-label={EVENT_CATEGORY_TEXTS.wheelLabel}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={hue}
        aria-valuetext={`Matiz ${hue}°, saturação ${saturation}% (${color})`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={handleKeyDown}
        className="absolute inset-0 cursor-crosshair rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79]"
        style={{ background: WHEEL_BACKGROUND, touchAction: 'none' }}
      >
        <div aria-hidden="true" className="absolute inset-0 rounded-full bg-black" style={{ opacity: 1 - hsv.v }} />
        <span
          aria-hidden="true"
          className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow"
          style={{ left: `${handle.left}%`, top: `${handle.top}%`, backgroundColor: color }}
        />
      </div>
      <div className="pointer-events-none absolute inset-0">
        {usedColors.map((used) => {
          const position = hsToWheelPercent(rgbToHsv(hexToRgb(used.color)))
          const label = getUsedColorLabel(used.color, used.name)

          return (
            <span
              key={used.id}
              role="img"
              aria-label={label}
              title={label}
              className="absolute flex h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ring-2 ring-white"
              style={{ left: `${position.left}%`, top: `${position.top}%`, backgroundColor: used.color }}
            >
              <X size={12} strokeWidth={3} aria-hidden="true" color={badgeTextColor(used.color)} />
            </span>
          )
        })}
      </div>
    </div>
  )
}
