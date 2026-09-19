import { useEffect, useState } from 'react'
import Admin from './components/admin/Admin.tsx'
import Order from './components/Order.tsx'
import Thanks from './components/Thanks.tsx'

/** Three pages, no router: the customer page, the confirmation, and hers. */
export default function App() {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (path.startsWith('/admin')) return <Admin />
  if (path.startsWith('/thanks')) return <Thanks />
  return <Order />
}
