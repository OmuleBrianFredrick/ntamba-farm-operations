import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ActionsWorkspace, CatalogueWorkspace, ManagementWorkspace, MyFormsWorkspace, QhseDashboard, QhseRoleBar, SubmissionComposer, SubmissionsWorkspace } from '../features/qhse/QhseWorkspace'
import { useQhseRole } from '../features/qhse/useQhseRole'
import type { QhseFormDefinition } from '../features/qhse/qhseCatalog'

const tabs = ['dashboard', 'my forms', 'submissions', 'actions', 'catalogue', 'management'] as const
type Tab = typeof tabs[number]

export function QhsePage() {
  const [params, setParams] = useSearchParams(); const requested = params.get('view')?.replace('-', ' '); const tab: Tab = tabs.includes(requested as Tab) ? requested as Tab : 'dashboard'
  const { role, setRole } = useQhseRole(); const { displayName } = useAuth(); const [selected, setSelected] = useState<QhseFormDefinition | null>(null)
  const open = (definition: QhseFormDefinition) => { setSelected(definition); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  return <div className="page qhse-page"><div className="page-heading"><div><h1>QHSE Forms</h1><p>Simplified controlled forms, assigned by responsibility, with review, restrictions and traceable follow-up.</p></div><a className="secondary-button qhse-guide-link" href="/qhse-forms/00_Issue_Register_and_Print_Guide.pdf" target="_blank" rel="noreferrer">Issue guide</a></div>
    <QhseRoleBar role={role} onRole={setRole} />
    <nav className="workspace-tabs" aria-label="QHSE workspace">{tabs.map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => { setSelected(null); setParams(item === 'dashboard' ? {} : { view: item.replace(' ', '-') }) }}>{item}</button>)}</nav>
    {selected ? <SubmissionComposer definition={selected} role={role} displayName={displayName} onClose={() => setSelected(null)} /> : null}
    {!selected && tab === 'dashboard' ? <QhseDashboard role={role} onOpen={open} /> : null}
    {!selected && tab === 'my forms' ? <MyFormsWorkspace role={role} onOpen={open} /> : null}
    {!selected && tab === 'submissions' ? <SubmissionsWorkspace role={role} /> : null}
    {!selected && tab === 'actions' ? <ActionsWorkspace /> : null}
    {!selected && tab === 'catalogue' ? <CatalogueWorkspace role={role} onOpen={open} /> : null}
    {!selected && tab === 'management' ? <ManagementWorkspace role={role} displayName={displayName} /> : null}
  </div>
}
