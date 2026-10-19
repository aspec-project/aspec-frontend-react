import MemberDashboardLayout from '../components/layout/MemberDashboardLayout'
import ShowcaseContactsForm from '../components/showcase/ShowcaseContactsForm'

/*
 * Página da secção “Contactos e redes” da área reservada.
 *
 * O layout mantém o menu lateral consistente entre todas as secções,
 * enquanto o formulário contém apenas os dados desta rota.
 */
export default function ShowcaseContactsPage() {
  return (
    <MemberDashboardLayout>
      <ShowcaseContactsForm />
    </MemberDashboardLayout>
  )
}