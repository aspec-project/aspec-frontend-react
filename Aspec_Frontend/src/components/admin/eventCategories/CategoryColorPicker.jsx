import { useId } from 'react'
import ColorWheel from './ColorWheel'
import { hsvToRgb } from '../../../utils/color'
import { EVENT_CATEGORY_TEXTS } from '../../../utils/eventCategories'

const inputClass = 'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:bg-gray-100'

const RGB_CHANNELS = [
  { key: 'r', short: 'R', label: EVENT_CATEGORY_TEXTS.redLabel },
  { key: 'g', short: 'G', label: EVENT_CATEGORY_TEXTS.greenLabel },
  { key: 'b', short: 'B', label: EVENT_CATEGORY_TEXTS.blueLabel },
]

/**
 * Seletor de cor de um tipo de evento: roda de cores (com as cores já usadas marcadas), barra "Luminosidade",
 * campo "Hexadecimal" e campos "RGB", todos sincronizados pelo hook do formulário. O hexadecimal e o RGB são a
 * alternativa completa à roda para quem não usa o rato. Os erros ficam junto ao campo, com `aria-invalid` e
 * `aria-describedby`.
 *
 * @param {{
 *   hsv: {h: number, s: number, v: number},
 *   hexInput: string,
 *   rgbInputs: {r: string, g: string, b: string},
 *   usedColors: {id: string, name: string, color: string}[],
 *   onHsvChange: (hsv: {h: number, s: number, v: number}) => void,
 *   onHexChange: (text: string) => void,
 *   onRgbChange: (channel: 'r'|'g'|'b', text: string) => void,
 *   errors: {color?: string, rgb?: string},
 * }} props
 * @returns {JSX.Element}
 */
export default function CategoryColorPicker({ hsv, hexInput, rgbInputs, usedColors, onHsvChange, onHexChange, onRgbChange, errors }) {
  const id = useId()
  const lightnessId = `${id}-lightness`
  const hexId = `${id}-hex`
  const hexErrorId = `${id}-hex-error`
  const rgbErrorId = `${id}-rgb-error`
  const hintId = `${id}-hint`
  const lightness = Math.round(hsv.v * 100)
  const bright = hsvToRgb({ h: hsv.h, s: hsv.s, v: 1 })

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 block text-sm font-medium text-gray-700">{EVENT_CATEGORY_TEXTS.colorLabel}</legend>

      <div className="flex justify-center">
        <ColorWheel hsv={hsv} usedColors={usedColors} onChange={(hs) => onHsvChange({ ...hsv, ...hs })} />
      </div>
      <p id={hintId} className="mt-3 text-xs text-gray-500">{EVENT_CATEGORY_TEXTS.usedColorsHint}</p>

      <div className="mt-4">
        <label htmlFor={lightnessId} className="mb-1 block text-sm font-medium text-gray-700">{EVENT_CATEGORY_TEXTS.lightnessLabel}</label>
        <input
          id={lightnessId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={lightness}
          aria-valuetext={`Luminosidade ${lightness}%`}
          onChange={(event) => onHsvChange({ ...hsv, v: Number(event.target.value) / 100 })}
          className="h-3 w-full cursor-pointer appearance-none rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79]"
          style={{ backgroundImage: `linear-gradient(to right, rgb(0, 0, 0), rgb(${bright.r}, ${bright.g}, ${bright.b}))` }}
        />
      </div>

      <div className="mt-4">
        <label htmlFor={hexId} className="mb-1 block text-sm font-medium text-gray-700">{EVENT_CATEGORY_TEXTS.hexLabel}</label>
        <input
          id={hexId}
          name="color"
          type="text"
          value={hexInput}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={errors.color ? 'true' : undefined}
          aria-describedby={errors.color ? hexErrorId : undefined}
          onChange={(event) => onHexChange(event.target.value)}
          className={`${inputClass} font-mono ${errors.color ? 'border-red-400' : 'border-gray-200'}`}
        />
        {errors.color && <p id={hexErrorId} className="mt-1 text-sm text-red-700">{errors.color}</p>}
      </div>

      <fieldset className="mt-4 min-w-0">
        <legend className="mb-1 block text-sm font-medium text-gray-700">{EVENT_CATEGORY_TEXTS.rgbLabel}</legend>
        <div className="grid grid-cols-3 gap-3">
          {RGB_CHANNELS.map((channel) => (
            <div key={channel.key}>
              <label htmlFor={`${id}-${channel.key}`} className="mb-1 block text-xs font-medium text-gray-600">{channel.short}</label>
              <input
                id={`${id}-${channel.key}`}
                type="number"
                min={0}
                max={255}
                step={1}
                value={rgbInputs[channel.key]}
                aria-label={channel.label}
                aria-invalid={errors.rgb ? 'true' : undefined}
                aria-describedby={errors.rgb ? rgbErrorId : undefined}
                onChange={(event) => onRgbChange(channel.key, event.target.value)}
                className={`${inputClass} ${errors.rgb ? 'border-red-400' : 'border-gray-200'}`}
              />
            </div>
          ))}
        </div>
        {errors.rgb && <p id={rgbErrorId} className="mt-1 text-sm text-red-700">{errors.rgb}</p>}
      </fieldset>
    </fieldset>
  )
}
