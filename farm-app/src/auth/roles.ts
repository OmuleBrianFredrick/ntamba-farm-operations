export type PlatformRole =
  | 'ceo'
  | 'administrator'
  | 'farm_manager'
  | 'accountant'
  | 'qhse_lead'
  | 'enterprise_supervisor'
  | 'storekeeper'
  | 'communications_officer'
  | 'worker'
  | 'auditor'

export const platformRoleLabels: Record<PlatformRole, string> = {
  ceo: 'CEO / farm owner',
  administrator: 'System administrator',
  farm_manager: 'Farm manager',
  accountant: 'Accountant',
  qhse_lead: 'QHSE lead',
  enterprise_supervisor: 'Enterprise supervisor',
  storekeeper: 'Storekeeper',
  communications_officer: 'Communications officer',
  worker: 'Worker / specialist',
  auditor: 'Auditor',
}

export const userManagementRoles: PlatformRole[] = ['ceo', 'administrator', 'farm_manager']

const rolePriority: PlatformRole[] = [
  'ceo', 'administrator', 'farm_manager', 'accountant', 'qhse_lead',
  'enterprise_supervisor', 'storekeeper', 'communications_officer', 'auditor', 'worker',
]

export function highestPriorityRole(roles: PlatformRole[]) {
  return rolePriority.find((role) => roles.includes(role)) ?? null
}

