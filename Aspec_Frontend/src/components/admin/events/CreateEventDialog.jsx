import EventFormDialog from './EventFormDialog'

/**
 * Modal "Criar Novo Evento" do backoffice. Delega no EventFormDialog em modo criação (formulário vazio,
 * botão "Criar evento"); o foco, o teclado e o envio são os do modal partilhado.
 *
 * @param {{
 *   options: {categories: object[], locations: object[], loading: boolean, error: string, retry: () => void},
 *   onClose: () => void,
 *   onSuccess: (message: string) => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function CreateEventDialog({ options, onClose, onSuccess }) {
  return <EventFormDialog mode="create" options={options} onClose={onClose} onSuccess={onSuccess} />
}
