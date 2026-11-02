/*
 * Cria os campos dos horários com base nos dias da semana devolvidos
 * pela API e nos horários já guardados no perfil.
 */
export function createBusinessHours(savedHours = [], weekDays = []) {
  return weekDays.map((day) => {
    const savedHour = savedHours.find(
      (hour) => Number(hour.week_day_id) === Number(day.id),
    )

    return {
      weekDayId: day.id,
      label: day.name,
      isOpen: Boolean(savedHour),
      openTime: savedHour?.open_time ?? '09:00',
      closeTime: savedHour?.close_time ?? '18:00',
    }
  })
}

const publicWeekDays = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']

export function groupBusinessHours(businessHours = []) {
  const groups = []

  for (const day of publicWeekDays) {
    const intervals = businessHours.filter((item) => item.week_day === day && item.open_time && item.close_time)
    /*
     * Compara todos os pares sem depender da ordem da API, conservando
     * os duplicados e a ordem original dos intervalos apresentados.
     */
    const signature = JSON.stringify(intervals.map((item) => [item.open_time, item.close_time]).sort())
    const previous = groups.at(-1)

    if (previous && previous.signature === signature) {
      previous.endDay = day
    } else {
      groups.push({ startDay: day, endDay: day, intervals, signature })
    }
  }

  return groups.map(({ startDay, endDay, intervals }) => ({
    label: startDay === endDay ? startDay : `${startDay.replace('-feira', '')} a ${endDay.replace('-feira', '')}`,
    intervals,
  }))
}
