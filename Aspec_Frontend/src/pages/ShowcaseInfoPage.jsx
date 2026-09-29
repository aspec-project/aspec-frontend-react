import MemberDashboardLayout from '../components/layout/MemberDashboardLayout'
import ShowcaseInfoForm from '../components/showcase/ShowcaseInfoForm'

/*
 * Esta página junta duas responsabilidades:
 * - o layout comum da área reservada do membro;
 * - o formulário específico da informação da montra.
 *
 * Assim, o formulário mantém-se separado do layout e fica mais simples
 * adicionar as próximas subtarefas: logótipo e portefólio.
 */
function ShowcaseInfoPage() {
  return (
    <MemberDashboardLayout>
      <ShowcaseInfoForm />
    </MemberDashboardLayout>
  )
}

export default ShowcaseInfoPage