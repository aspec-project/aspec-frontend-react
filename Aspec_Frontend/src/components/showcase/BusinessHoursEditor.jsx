import { Clock3 } from 'lucide-react'

/*
 * O mockup usa selects de meia em meia hora. Mantemos os valores como texto
 * no mesmo formato que a API recebe (HH:mm).
 */
const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, '0')
  const minutes = index % 2 === 0 ? '00' : '30'

  return `${hours}:${minutes}`
})

const shortDayNames = {
  segunda: 'Seg',
  terça: 'Ter',
  terca: 'Ter',
  quarta: 'Qua',
  quinta: 'Qui',
  sexta: 'Sex',
  sábado: 'Sáb',
  sabado: 'Sáb',
  domingo: 'Dom',
}

function getShortDayName(label) {
  return shortDayNames[label?.trim().toLowerCase()] ?? label?.slice(0, 3)
}

function isWorkingWeekDay(label) {
  return ['segunda', 'terça', 'terca', 'quarta', 'quinta', 'sexta'].includes(
    label?.trim().toLowerCase(),
  )
}

/*
 * Componente visual dos horários da empresa.
 *
 * Não comunica diretamente com a API. O componente pai recebe a lista
 * atualizada através de onChange e será responsável pelo envio.
 */
function BusinessHoursEditor({ businessHours, onChange, footer = null }) {
  /*
   * Atualiza apenas a propriedade alterada do dia respetivo.
   */
  function handleHourChange(weekDayId, field, value) {
    const updatedHours = businessHours.map((hour) => {
      if (hour.weekDayId !== weekDayId) {
        return hour
      }

      return {
        ...hour,
        [field]: value,
      }
    })

    onChange(updatedHours)
  }

  /*
   * Replica o atalho do Figma e aplica o horário de segunda-feira aos dias
   * úteis, sem alterar o sábado ou domingo.
   */
  function copyMondayScheduleToWeekdays() {
    const monday = businessHours.find(
      (hour) => hour.label?.trim().toLowerCase() === 'segunda',
    )

    if (!monday) {
      return
    }

    onChange(
      businessHours.map((hour) => {
        if (!isWorkingWeekDay(hour.label)) {
          return hour
        }

        return {
          ...hour,
          isOpen: monday.isOpen,
          openTime: monday.openTime,
          closeTime: monday.closeTime,
        }
      }),
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-[#0d1f35]">
        <Clock3 size={20} className="text-[#9b7b45]" aria-hidden="true" />
        Horário de Atendimento
      </h2>

      <div className="mt-5 space-y-3">
        {businessHours.map((hour) => {
          const shortDayName = getShortDayName(hour.label)

          return (
            <div
              key={hour.weekDayId}
              className="grid grid-cols-[2.25rem_2.5rem_minmax(0,1fr)] items-center gap-2"
            >
              <span className="text-sm font-medium text-slate-600">
                {shortDayName}
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={hour.isOpen}
                aria-label={`${hour.label} aberto`}
                onClick={() =>
                  handleHourChange(hour.weekDayId, 'isOpen', !hour.isOpen)
                }
                className={`relative h-6 w-10 rounded-full transition focus:outline-none focus:ring-2 focus:ring-[#9b7b45]/40 focus:ring-offset-2 ${
                  hour.isOpen ? 'bg-[#9b7b45]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                    hour.isOpen ? 'left-5' : 'left-1'
                  }`}
                />
              </button>

              {hour.isOpen ? (
                <div className="flex min-w-0 items-center gap-2">
                  <select
                    value={hour.openTime}
                    aria-label={`Abertura de ${hour.label}`}
                    onChange={(event) =>
                      handleHourChange(
                        hour.weekDayId,
                        'openTime',
                        event.target.value,
                      )
                    }
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800 outline-none focus:border-[#9b7b45] focus:ring-2 focus:ring-[#9b7b45]/20"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>

                  <span className="text-slate-400" aria-hidden="true">
                    —
                  </span>

                  <select
                    value={hour.closeTime}
                    aria-label={`Fecho de ${hour.label}`}
                    onChange={(event) =>
                      handleHourChange(
                        hour.weekDayId,
                        'closeTime',
                        event.target.value,
                      )
                    }
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800 outline-none focus:border-[#9b7b45] focus:ring-2 focus:ring-[#9b7b45]/20"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-sm italic text-slate-400">Encerrado</span>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={copyMondayScheduleToWeekdays}
        className="mt-5 text-sm font-medium text-[#8a7043] underline decoration-[#8a7043]/50 underline-offset-4 transition hover:text-[#705b36]"
      >
        Copiar horário de segunda para sexta
      </button>

      {footer}
    </section>
  )
}

export default BusinessHoursEditor
