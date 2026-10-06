import { api } from './api'

/*
 * Endereço do backend usado para transformar URLs relativas devolvidas
 * pela API em URLs completas que o browser consegue abrir.
 */
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/*
 * O Laravel devolve ficheiros públicos como "/storage/...".
 * Como o frontend está noutra porta, juntamos o endereço do backend.
 *
 * Se no futuro a API já devolver um URL completo, devolvemo-lo sem alterar.
 */
function createAssetUrl(assetUrl) {
  if (!assetUrl) {
    return ''
  }

  if (/^https?:\/\//i.test(assetUrl)) {
    return assetUrl
  }

  return new URL(assetUrl, `${API_URL}/`).toString()
}

/*
 * Prepara os dados recebidos da API para serem usados diretamente
 * pelos componentes React.
 */
function normaliseMemberProfile(profile) {
  if (!profile) {
    return profile
  }

  return {
    ...profile,

    // URL completo do logótipo guardado no backend.
    logo_url: createAssetUrl(profile.logo_url),

    // Cada imagem do portefólio também recebe um URL completo.
    portfolio: (profile.portfolio ?? []).map((portfolioImage) => ({
      ...portfolioImage,
      image_url: createAssetUrl(portfolioImage.image_url),
    })),
  }
}

/*
 * Obtém os dados do perfil do membro autenticado.
 * A API responde no formato { success, message, data },
 * por isso devolvemos apenas o perfil normalizado.
 */
export async function getMemberProfile() {
  const response = await api.get('/member-profile')

  return normaliseMemberProfile(response.data.data)
}

/*
 * Atualiza o perfil com dados já convertidos para o formato esperado pela API.
 */
export async function updateMemberProfile(profilePayload) {
  const response = await api.put('/member-profile', profilePayload)

  return normaliseMemberProfile(response.data.data)
}

/*
 * Envia o logótipo como ficheiro binário através de FormData.
 */
export async function uploadMemberLogo(logoFile) {
  const formData = new FormData()

  formData.append('logo', logoFile)

  const response = await api.post('/member-profile/logo', formData)

  return response.data.data
}

/*
 * A API recebe uma imagem por pedido, no campo "image".
 * O envio sequencial evita atingir rapidamente o limite de pedidos.
 */
export async function uploadPortfolioImages(imageFiles) {
  const uploadedImages = []

  for (const imageFile of imageFiles) {
    const formData = new FormData()

    formData.append('image', imageFile)

    const response = await api.post('/member-portfolio', formData)

    uploadedImages.push(response.data.data)
  }

  return uploadedImages
}

/*
 * Remove uma imagem já guardada no portefólio do membro autenticado.
 *
 * portfolioImageId é o identificador devolvido pela API para essa imagem.
 */
export async function deletePortfolioImage(portfolioImageId) {
  const response = await api.delete(
    `/member-portfolio/${portfolioImageId}`,
  )

  return response.data
}