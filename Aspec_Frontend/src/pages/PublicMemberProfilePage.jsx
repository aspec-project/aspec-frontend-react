import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublicMemberProfile, isMemberProfileId } from '../services/members'
import { useAuthStore } from '../store/authStore'
import PublicMemberProfile from '../components/members/PublicMemberProfile'

export default function PublicMemberProfilePage() {
  const { id } = useParams()
  const user = useAuthStore((state) => state.user)
  const sessionStatus = useAuthStore((state) => state.status)
  const allowContacts = sessionStatus === 'authenticated' && ['Member', 'Admin'].includes(user?.role?.name) && user?.account_status?.name === 'Active'
  const allowReview = allowContacts && user?.role?.name === 'Member'
  const allowComments = sessionStatus === 'authenticated' && !!user?.id && ['Member', 'Admin'].includes(user?.role?.name)
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const snapshot = { id, user, sessionStatus, retry }
    if (isMemberProfileId(id)) {
      getPublicMemberProfile(id, allowContacts, controller.signal)
        .then((member) => { if (!controller.signal.aborted) setResult({ ...snapshot, status: 'success', member }) })
        .catch((error) => {
          if (!controller.signal.aborted) setResult({ ...snapshot, status: error.response?.status === 404 ? 'not-found' : 'error' })
        })
    }
    return () => controller.abort()
  }, [id, user, sessionStatus, allowContacts, retry])

  /*
   * A mudança de contexto limpa o resultado durante o render, antes
   * de o efeito cancelar o pedido, impedindo a exposição de dados antigos.
   */
  const current = result?.id === id && result.user === user && result.sessionStatus === sessionStatus && result.retry === retry ? result : null
  if (result !== null && current === null) setResult(null)
  let content
  if (!isMemberProfileId(id) || current?.status === 'not-found') {
    content = (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <h1 className="text-2xl font-medium">Perfil não encontrado</h1>
        <p className="mt-4">O perfil solicitado não está disponível.</p>
      </div>
    )
  } else if (!current) {
    content = <p role="status" className="px-6 py-16 text-center">A carregar perfil...</p>
  } else if (current.status === 'error') {
    content = (
      <div role="alert" className="mx-auto max-w-7xl px-6 py-16">
        <p>Não foi possível carregar o perfil. Tente novamente.</p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-[#0d1f35] px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-4"
          onClick={() => setRetry((value) => value + 1)}
        >Tentar novamente</button>
      </div>
    )
  } else {
    content = <PublicMemberProfile member={current.member} allowContacts={allowContacts} allowReview={allowReview} allowComments={allowComments} />
  }
  return (
    <div className="min-h-[50vh] bg-gray-50 text-gray-800">
      <div className="bg-[#0d1f35]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <Link to="/membros" className="rounded text-sm text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4">← Voltar ao diretório</Link>
        </div>
      </div>
      {content}
    </div>
  )
}
