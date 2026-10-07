/*
 * Dias e respetivos IDs definidos pelo backend.
 * Estes IDs são usados quando enviamos business_hours para a API.
 */
export const WEEK_DAYS = [
  { id: 1, label: 'Segunda-feira' },
  { id: 2, label: 'Terça-feira' },
  { id: 3, label: 'Quarta-feira' },
  { id: 4, label: 'Quinta-feira' },
  { id: 5, label: 'Sexta-feira' },
  { id: 6, label: 'Sábado' },
  { id: 7, label: 'Domingo' },
]

/*
 * Cria o estado inicial dos horários.
 *
 * Se a API já tiver horários guardados, reutilizamos esses valores.
 * Caso contrário, cada dia começa fechado, com horas predefinidas.
 */
export function createBusinessHours(savedHours = []) {
  return WEEK_DAYS.map((day) => {
    const savedHour = savedHours.find(
      (hour) => Number(hour.week_day_id) === day.id,
    )

    return {
      weekDayId: day.id,
      label: day.label,
      isOpen: Boolean(savedHour),
      openTime: savedHour?.open_time ?? '09:00',
      closeTime: savedHour?.close_time ?? '18:00',
    }
  })
}