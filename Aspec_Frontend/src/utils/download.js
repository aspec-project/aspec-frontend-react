/**
 * Guarda um Blob no disco através de uma ligação temporária com o atributo `download`.
 * A ligação e o URL `blob:` são removidos logo a seguir, mesmo que o clique falhe.
 *
 * @param {Blob} blob Conteúdo do ficheiro.
 * @param {string} filename Nome com que o browser guarda o ficheiro.
 * @returns {void}
 */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)

  try {
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(url)
  }
}
