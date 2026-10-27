import { useEffect } from 'react'

export default function PageTitle({ title, children = null }) {
  useEffect(() => {
    document.title = `${title} | ASPEC`
    return () => {
      document.title = 'ASPEC'
    }
  }, [title])

  return children
}
