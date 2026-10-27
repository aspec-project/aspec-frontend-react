import EventFormDialog from './EventFormDialog'

/**
 * Modal "Editar Evento" do backoffice. Delega no EventFormDialog em modo edição: começa com os dados do
 * evento da lista, só deixa guardar com alterações e, se o evento já decorreu ou já não existe, chama
 * `onStale` com a mensagem a mostrar na página.
 *
 * @param {{
 *   event: object,
 *   options: {categories: object[], locations: object[], loading: boolean, error: string, retry: () => void},
 *   onClose: () => void,
 *   onSuccess: (message: string) => void,
 *   onStale: (message: string) => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function EditEventDialog({ event, options, onClose, onSuccess, onStale }) {
  return (
    <EventFormDialog
      mode="edit"
      event={event}
      options={options}
      onClose={onClose}
      onSuccess={onSuccess}
      onStale={onStale}
    />
  )
}
