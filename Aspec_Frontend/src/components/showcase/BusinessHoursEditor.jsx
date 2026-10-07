/*
 * Componente visual dos horários da empresa.
 *
 * Não comunica diretamente com a API. O componente pai recebe a lista
 * atualizada através de onChange e será responsável pelo envio.
 */
function BusinessHoursEditor({ businessHours, onChange }) {
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

  return (
    <section className="rounded-xl border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-[#0d1f35]">Horários</h2>

      <p className="mt-2 text-sm text-slate-600">
        Seleciona os dias em que a empresa está aberta e indica o respetivo
        horário.
      </p>

      <div className="mt-6 space-y-4">
        {businessHours.map((hour) => (
          <div
            key={hour.weekDayId}
            className="grid gap-4 rounded-lg border border-slate-200 p-4 md:grid-cols-[minmax(160px,1fr)_140px_140px]"
          >
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={hour.isOpen}
                onChange={(event) =>
                  handleHourChange(
                    hour.weekDayId,
                    'isOpen',
                    event.target.checked,
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-[#8a7043] focus:ring-[#8a7043]"
              />

              {hour.label}
            </label>

            <label className="text-sm text-slate-700">
              Abertura

              <input
                type="time"
                value={hour.openTime}
                disabled={!hour.isOpen}
                onChange={(event) =>
                  handleHourChange(
                    hour.weekDayId,
                    'openTime',
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700">
              Fecho

              <input
                type="time"
                value={hour.closeTime}
                disabled={!hour.isOpen}
                onChange={(event) =>
                  handleHourChange(
                    hour.weekDayId,
                    'closeTime',
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </label>
          </div>
        ))}
      </div>
    </section>
  )
}

export default BusinessHoursEditor