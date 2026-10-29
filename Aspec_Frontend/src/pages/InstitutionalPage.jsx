export default function InstitutionalPage({ content }) {
  return (
    <article className="bg-gray-50 text-gray-800" aria-labelledby="institutional-title">
      <header className="bg-[#0d1f35] py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-6">
          <h1 id="institutional-title" className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            {content.title}
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 sm:py-12">
        <p className="mb-8 border-l-2 border-primary pl-4 text-sm leading-relaxed text-gray-600">
          Conteúdo provisório
        </p>
        <div className="space-y-8">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-4 text-xl font-semibold text-[#0d1f35]">{section.title}</h2>
              <div className="space-y-4 leading-relaxed">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {section.subsections?.map((subsection) => (
                <div key={subsection.title} className="mt-6">
                  <h3 className="mb-3 text-lg font-semibold text-[#0d1f35]">{subsection.title}</h3>
                  <div className="space-y-4 leading-relaxed">
                    {subsection.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </article>
  )
}
