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