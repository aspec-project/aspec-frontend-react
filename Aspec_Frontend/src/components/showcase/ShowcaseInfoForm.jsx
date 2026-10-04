import { useState } from 'react'
import LogoUploader from './LogoUploader'
import PortfolioGallery from './PortfolioGallery'

/*
 * Estado inicial do formulário.
 * Cada propriedade corresponde ao atributo "name" de um campo.
 * Mais tarde, na ASPEC-37, estes dados serão enviados para a API.
 */
const initialFormData = {
  description: '',
  services: '',
  openingHours: '',
  email: '',
  phone: '',
  website: '',
  instagram: '',
  facebook: '',
  linkedin: '',
  youtube: '',
}

function ShowcaseInfoForm() {
  /*
   * formData guarda aquilo que o utilizador escreve nos campos.
   * isPrepared serve apenas para mostrar uma mensagem local após submeter.
   */
  const [formData, setFormData] = useState(initialFormData)
  const [isPrepared, setIsPrepared] = useState(false)

  /*
   * Esta função é reutilizada por todos os campos.
   * Usa o "name" do input para atualizar apenas o valor correto.
   */
  function handleChange(event) {
    const { name, value } = event.target

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }))

    // Se o utilizador voltar a editar, escondemos a mensagem anterior.
    setIsPrepared(false)
  }

  /*
   * Por agora impedimos o comportamento normal do formulário
   * (recarregar a página) e mostramos apenas uma confirmação visual.
   *
   * O pedido à API será adicionado na ASPEC-37.
   */
  function handleSubmit(event) {
    event.preventDefault()
    setIsPrepared(true)
  }

  /*
   * Classe Tailwind reutilizada pelos inputs de uma linha.
   * Ajuda a manter todos os campos visualmente consistentes.
   */
  const inputClassName =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#8a7043] focus:ring-2 focus:ring-[#8a7043]/20'

  return (
    <section>
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a7043]">
          Montra digital
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#0d1f35]">
          Informação da montra
        </h1>

        <p className="mt-3 max-w-2xl text-slate-600">
          Preenche a informação que será apresentada aos visitantes na tua
          montra digital.
        </p>
      </div>

      <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
        {/* Secção: apresentação principal da empresa */}
        <section className="rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-[#0d1f35]">
            Apresentação
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <label
                htmlFor="description"
                className="text-sm font-medium text-slate-700"
              >
                Descrição
              </label>

              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="5"
                placeholder="Apresenta a tua empresa, missão e principais pontos fortes."
                className={`${inputClassName} resize-y`}
              />
            </div>

            <div>
              <label
                htmlFor="services"
                className="text-sm font-medium text-slate-700"
              >
                Serviços / Produtos
              </label>

              <textarea
                id="services"
                name="services"
                value={formData.services}
                onChange={handleChange}
                rows="4"
                placeholder="Exemplo: desenvolvimento web, design gráfico, consultoria..."
                className={`${inputClassName} resize-y`}
              />
            </div>

            <div>
              <label
                htmlFor="openingHours"
                className="text-sm font-medium text-slate-700"
              >
                Horários
              </label>

              <textarea
                id="openingHours"
                name="openingHours"
                value={formData.openingHours}
                onChange={handleChange}
                rows="3"
                placeholder="Exemplo: Segunda a sexta, das 09:00 às 18:00."
                className={`${inputClassName} resize-y`}
              />
            </div>
          </div>
        </section>

        {/* Secção: formas diretas de contacto */}
        <section className="rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-[#0d1f35]">Contactos</h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="empresa@exemplo.pt"
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="text-sm font-medium text-slate-700"
              >
                Telefone
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+351 912 345 678"
                className={inputClassName}
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="website"
                className="text-sm font-medium text-slate-700"
              >
                Website
              </label>

              <input
                id="website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://www.exemplo.pt"
                className={inputClassName}
              />
            </div>
          </div>
        </section>

        {/* Secção: ligações para as redes sociais da empresa */}
        <section className="rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-[#0d1f35]">
            Redes sociais
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <label
                htmlFor="instagram"
                className="text-sm font-medium text-slate-700"
              >
                Instagram
              </label>

              <input
                id="instagram"
                name="instagram"
                type="url"
                value={formData.instagram}
                onChange={handleChange}
                placeholder="https://instagram.com/empresa"
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="facebook"
                className="text-sm font-medium text-slate-700"
              >
                Facebook
              </label>

              <input
                id="facebook"
                name="facebook"
                type="url"
                value={formData.facebook}
                onChange={handleChange}
                placeholder="https://facebook.com/empresa"
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="linkedin"
                className="text-sm font-medium text-slate-700"
              >
                LinkedIn
              </label>

              <input
                id="linkedin"
                name="linkedin"
                type="url"
                value={formData.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/company/empresa"
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="youtube"
                className="text-sm font-medium text-slate-700"
              >
                Youtube
              </label>

              <input
                id="youtube"
                name="youtube"
                type="url"
                value={formData.youtube}
                onChange={handleChange}
                placeholder="https://youtube.com/@empresa"
                className={inputClassName}
              />
            </div>

          </div>
        </section>

        {/* Secção de carregamento do logótipo da montra digital. */}
        <LogoUploader />

        {/* Galeria de imagens do portefólio — ASPEC-36. */}
        <PortfolioGallery />

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-[#8a7043] px-6 py-3 font-semibold text-white transition hover:bg-[#705b36] focus:outline-none focus:ring-2 focus:ring-[#8a7043] focus:ring-offset-2"
          >
            Guardar alterações
          </button>

          {/* A mensagem é anunciada também a tecnologias de apoio. */}
          {isPrepared && (
            <p className="text-sm font-medium text-emerald-700" aria-live="polite">
              Alterações preparadas. O envio para a API será feito na ASPEC-37.
            </p>
          )}
        </div>
      </form>
    </section>
  )
}

export default ShowcaseInfoForm