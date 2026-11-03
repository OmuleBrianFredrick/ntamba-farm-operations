import { useState } from 'react'
import type { QhseRole } from './qhseCatalog'

export function useQhseRole() {
  const [role, setRole] = useState<QhseRole>(() => (localStorage.getItem('ntamba-qhse-role') as QhseRole) || 'manager')
  const update = (value: QhseRole) => { localStorage.setItem('ntamba-qhse-role', value); setRole(value) }
  return { role, setRole: update }
}
