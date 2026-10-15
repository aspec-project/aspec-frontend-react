import { useId } from 'react'
import UserActions from './UserActions'
import UserStatusBadge from './UserStatusBadge'
import { safeMemberUrl } from '../../../services/members'
import {
  formatBusinessHours,
  formatFullDate,
  getDisplayName,
  getInitial,
  getRoleLabel,
  getStatusBadge,
} from '../../../utils/adminUsers'

/**
 * Cartão branco com título, anunciado como região com o nome do título.
 *
 * @param {{title: string, children: React.ReactNode}} props
 * @returns {JSX.Element}
 */
function DetailCard({ title, children }) {
  const id = useId()

  return (
    <section aria-labelledby={id} className="rounded-xl bg-white p-6 shadow-sm">
      <h3 id={id} className="text-lg font-semibold text-[#0d1f35]">{title}</h3>
      {children}
    </section>
  )
}

/**
 * Lista de pares rótulo/valor; valores vazios aparecem como "Não indicado".
 *
 * @param {{fields: [string, React.ReactNode][]}} props
 * @returns {JSX.Element}
 */
function FieldList({ fields }) {
  return (
    <dl className="mt-4 space-y-3">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">
            {value === null || value === undefined || value === '' ? 'Não indicado' : value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Ligação externa num novo separador, só para URLs http/https sem credenciais;
 * outros valores aparecem como texto, sem ligação.
 *
 * @param {{href: string}} props
 * @returns {JSX.Element}
 */
function ExternalLink({ href }) {
  const safe = safeMemberUrl(href)

  if (!safe) {
    return <span className="break-all">{href}</span>
  }

  return (
    <a href={safe} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-[#0d1f35] underline">
      {href}
    </a>
  )
}

/**
 * Detalhe de um utilizador do backoffice: cabeçalho com logótipo, nome, estado e ações, e os
 * cartões Perfil, Horário, Portefólio, Conta e Redes sociais. Sem perfil de membro mostra só a conta.
 *
 * @param {{
 *   user: object,
 *   actions: ('approve'|'reject'|'block'|'unblock')[],
 *   actionsDisabled?: boolean,
 *   busy?: boolean,
 *   onAction: (action: string, user: object) => void,
 * }} props
 * @returns {JSX.Element}
 */
export default function UserDetail({ user, actions, actionsDisabled = false, busy = false, onAction }) {
  const profile = user.member_profile
  const name = getDisplayName(user)
  const logoUrl = safeMemberUrl(profile?.logo_url, true)
  const website = profile?.website_url ? <ExternalLink href={profile.website_url} /> : null
  const portfolio = (profile?.portfolio ?? [])
    .map((image) => ({ id: image.id, url: safeMemberUrl(image.image_url, true) }))
    .filter((image) => image.url)

  return (
    <div aria-busy={busy} className={`space-y-6 transition-opacity ${busy ? 'opacity-60' : ''}`}>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt={`Logótipo de ${name}`} referrerPolicy="no-referrer" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#0d1f35] text-xl font-semibold text-white">
              {getInitial(user)}
            </span>
          )}
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-[#0d1f35]">{name}</h2>
              {user.role?.name === 'Admin' && (
                <span className="rounded-full bg-[#8a7043]/10 px-2 py-0.5 text-xs font-semibold text-[#8a7043]">Admin</span>
              )}
            </div>
            {profile?.business_name && <p className="text-sm text-gray-500">{profile.business_name}</p>}
            <UserStatusBadge user={user} />
          </div>
        </div>
        {actions.length > 0 && (
          <UserActions user={user} actions={actions} disabled={actionsDisabled} onAction={onAction} />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {profile ? (
            <>
              <DetailCard title="Perfil">
                <FieldList
                  fields={[
                    ['Nome profissional', profile.name],
                    ['Setor', profile.sector?.name],
                    ['Localidade', profile.location?.name],
                    ['Congregação', profile.congregation],
                    ['Função na congregação', profile.role_in_congregation],
                    ['Morada', profile.address],
                    ['Website', website],
                    ['Contactos comerciais', profile.commercial_contacts],
                    ['Descrição', profile.description],
                  ]}
                />
              </DetailCard>

              <DetailCard title="Horário">
                {profile.business_hours?.length > 0 ? (
                  <dl className="mt-4 space-y-2">
                    {formatBusinessHours(profile.business_hours).map((day) => (
                      <div key={day.label} className="flex justify-between gap-4 text-sm">
                        <dt className="font-medium text-gray-700">{day.label}</dt>
                        <dd className="text-gray-800">{day.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-4 text-sm text-gray-600">Sem horário definido.</p>
                )}
              </DetailCard>

              <DetailCard title="Portefólio">
                {portfolio.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {portfolio.map((image, index) => (
                      <img
                        key={image.id}
                        src={image.url}
                        alt={`Imagem ${index + 1} do portefólio de ${name}`}
                        referrerPolicy="no-referrer"
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-600">Sem imagens no portefólio.</p>
                )}
              </DetailCard>
            </>
          ) : (
            <DetailCard title="Perfil">
              <p className="mt-4 text-sm text-gray-600">Este utilizador não tem perfil de membro.</p>
            </DetailCard>
          )}
        </div>

        <div className="space-y-6">
          <DetailCard title="Conta">
            <FieldList
              fields={[
                ['Email', user.email],
                ['Telefone', user.phone],
                ['Papel', getRoleLabel(user)],
                ['Estado', getStatusBadge(user).label],
                ['Data de registo', formatFullDate(user.created_at)],
              ]}
            />
          </DetailCard>

          {profile && (
            <DetailCard title="Redes sociais">
              {profile.social_links?.length > 0 ? (
                <ul className="mt-4 space-y-3 text-sm text-gray-800">
                  {profile.social_links.map((link) => (
                    <li key={link.platform_id}>
                      <p className="font-semibold">{link.platform}</p>
                      <ExternalLink href={link.url} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-gray-600">Sem redes sociais.</p>
              )}
            </DetailCard>
          )}
        </div>
      </div>
    </div>
  )
}
