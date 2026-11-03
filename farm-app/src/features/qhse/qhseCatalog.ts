export type QhseRole = 'worker' | 'supervisor' | 'qhse' | 'manager' | 'owner'
export type QhseWorkflow = 'inspection' | 'event' | 'application' | 'register' | 'review'
export type QhseFrequency = 'daily' | 'weekly' | 'monthly' | 'event' | 'before-use' | 'scheduled'

export type QhseFormDefinition = {
  id: string
  title: string
  category: string
  workflow: QhseWorkflow
  frequency: QhseFrequency
  assignedRoles: QhseRole[]
  enterprises: string[]
  confidential: boolean
  version: '01'
  questions: string[]
  sourceFile: string
}

const oversight: QhseRole[] = ['qhse', 'manager', 'owner']
const fieldRoles: QhseRole[] = ['worker', 'supervisor', ...oversight]
const leadRoles: QhseRole[] = ['supervisor', ...oversight]

const questionSets: Record<QhseWorkflow, string[]> = {
  inspection: ['What did you check?', 'What problem or unsafe condition did you find?', 'What immediate action did you take?'],
  event: ['What happened or could have happened?', 'Who, what or which product was affected?', 'What did you do immediately to prevent further harm?'],
  application: ['What product, material or treatment was used?', 'How much was used and exactly where?', 'Which safety, label or withdrawal checks were completed?'],
  register: ['What activity or item are you recording?', 'What quantity, result or measurement was observed?', 'Is any follow-up needed?'],
  review: ['What was planned or reviewed?', 'What is incomplete, off target or needs attention?', 'Who owns the next action and when is it due?'],
}

const sourceFiles: Record<string, string> = {
  '01': '01_Daily_Farm_Inspection.pdf', '02': '02_Task_Risk_Assessment.pdf', '03': '03_Toolbox_Talk_Attendance.pdf', '04': '04_Hazard_Incident_Report.pdf',
  '05': '05_Corrective_Action.pdf', '06': '06_Emergency_Equipment_Check.pdf', '07': '07_Emergency_Drill_Record.pdf', '08': '08_PPE_Issue_Fit_Check.pdf',
  '09': '09_Machinery_PreUse_Check.pdf', '10': '10_Chemical_Store_Inventory.pdf', '11': '11_Pesticide_Application_Record.pdf', '12': '12_Fertilizer_Application.pdf',
  '13': '13_Water_Irrigation_Record.pdf', '14': '14_Waste_Disposal_Record.pdf', '15': '15_Environmental_Inspection.pdf', '16': '16_Harvest_Quality_Traceability.pdf',
  '17': '17_Cleaning_Hygiene_Check.pdf', '18': '18_Product_Hold_Release.pdf', '19': '19_Visitor_Contractor_Induction.pdf', '20': '20_Training_Competence_Record.pdf',
  '21': '21_Livestock_Biosecurity_Treatment.pdf', '22': '22_Maintenance_Return_to_Service.pdf', '23': '23_Crop_Block_Register.pdf', '24': '24_Banana_Husbandry_Log.pdf',
  '25': '25_Coffee_Husbandry_Log.pdf', '26': '26_Seasonal_Crop_Diary.pdf', '27': '27_Dairy_Milk_Hygiene.pdf', '28': '28_Animal_Identity_Breeding.pdf',
  '29': '29_Livestock_Feed_Welfare.pdf', '30': '30_Poultry_Daily_Record.pdf', '31': '31_Fish_Pond_Daily_Log.pdf', '32': '32_Fish_Stocking_Harvest.pdf',
  '33': '33_Apiary_Hive_Record.pdf', '34': '34_Animal_Movement_Quarantine.pdf', '35': '35_Mortality_Disposal_Record.pdf', '36': '36_Preventive_Animal_Health.pdf',
  '37': '37_Employee_Attendance_Allocation.pdf', '38': '38_Farm_Manager_Weekly_Review.pdf',
}

function form(id: string, title: string, category: string, workflow: QhseWorkflow, frequency: QhseFrequency, assignedRoles: QhseRole[], enterprises: string[] = ['All farm'], confidential = false, questions?: string[]): QhseFormDefinition {
  const sourceFile = sourceFiles[id]
  return { id, title, category, workflow, frequency, assignedRoles, enterprises, confidential, version: '01', questions: questions ?? questionSets[workflow], sourceFile }
}

export const qhseCategories = [
  'Safety & incidents', 'Emergency, PPE & machinery', 'Chemicals & environment', 'Quality & hygiene',
  'People & competence', 'Crop operations', 'Animal operations', 'Management & workforce',
]

export const qhseForms: QhseFormDefinition[] = [
  form('01', 'Daily Farm Inspection', 'Safety & incidents', 'inspection', 'daily', leadRoles),
  form('02', 'Task Risk Assessment', 'Safety & incidents', 'review', 'event', leadRoles),
  form('03', 'Toolbox Talk Attendance', 'Safety & incidents', 'register', 'event', fieldRoles),
  form('04', 'Hazard & Incident Report', 'Safety & incidents', 'event', 'event', fieldRoles, ['All farm'], true),
  form('05', 'Corrective Action', 'Safety & incidents', 'review', 'event', oversight),
  form('06', 'Emergency Equipment Check', 'Emergency, PPE & machinery', 'inspection', 'monthly', leadRoles),
  form('07', 'Emergency Drill Record', 'Emergency, PPE & machinery', 'review', 'scheduled', leadRoles),
  form('08', 'PPE Issue & Fit Check', 'Emergency, PPE & machinery', 'register', 'event', fieldRoles),
  form('09', 'Machinery Pre-Use Check', 'Emergency, PPE & machinery', 'inspection', 'before-use', fieldRoles),
  form('10', 'Chemical Store Inventory', 'Chemicals & environment', 'register', 'weekly', leadRoles, ['Stores', 'Crops']),
  form('11', 'Pesticide Application Record', 'Chemicals & environment', 'application', 'event', leadRoles, ['Banana', 'Coffee', 'Seasonal crops', 'Garden crops']),
  form('12', 'Fertilizer Application', 'Chemicals & environment', 'application', 'event', fieldRoles, ['Banana', 'Coffee', 'Seasonal crops', 'Garden crops']),
  form('13', 'Water & Irrigation Record', 'Chemicals & environment', 'register', 'daily', fieldRoles, ['Crops', 'Fish']),
  form('14', 'Waste Disposal Record', 'Chemicals & environment', 'register', 'event', fieldRoles),
  form('15', 'Environmental Inspection', 'Chemicals & environment', 'inspection', 'monthly', leadRoles),
  form('16', 'Harvest Quality & Traceability', 'Quality & hygiene', 'inspection', 'event', leadRoles, ['Banana', 'Coffee', 'Seasonal crops', 'Garden crops']),
  form('17', 'Cleaning & Hygiene Check', 'Quality & hygiene', 'inspection', 'daily', fieldRoles),
  form('18', 'Product Hold & Release', 'Quality & hygiene', 'review', 'event', oversight, ['All farm'], true),
  form('19', 'Visitor & Contractor Induction', 'People & competence', 'inspection', 'event', fieldRoles),
  form('20', 'Training & Competence Record', 'People & competence', 'review', 'scheduled', leadRoles, ['All farm'], true),
  form('21', 'Livestock Biosecurity & Treatment', 'Animal operations', 'inspection', 'event', leadRoles, ['Livestock', 'Poultry']),
  form('22', 'Maintenance & Return to Service', 'Emergency, PPE & machinery', 'inspection', 'event', leadRoles),
  form('23', 'Crop Block Register', 'Crop operations', 'register', 'scheduled', leadRoles, ['Banana', 'Coffee', 'Seasonal crops', 'Garden crops']),
  form('24', 'Banana Husbandry Log', 'Crop operations', 'register', 'daily', fieldRoles, ['Banana']),
  form('25', 'Coffee Husbandry Log', 'Crop operations', 'register', 'daily', fieldRoles, ['Coffee']),
  form('26', 'Seasonal Crop Diary', 'Crop operations', 'register', 'daily', fieldRoles, ['Seasonal crops', 'Garden crops']),
  form('27', 'Dairy Milk & Hygiene', 'Animal operations', 'inspection', 'daily', fieldRoles, ['Dairy']),
  form('28', 'Animal Identity & Breeding', 'Animal operations', 'register', 'event', leadRoles, ['Livestock']),
  form('29', 'Livestock Feed & Welfare', 'Animal operations', 'inspection', 'daily', fieldRoles, ['Livestock']),
  form('30', 'Poultry Daily Record', 'Animal operations', 'register', 'daily', fieldRoles, ['Poultry']),
  form('31', 'Fish Pond Daily Log', 'Animal operations', 'inspection', 'daily', fieldRoles, ['Fish']),
  form('32', 'Fish Stocking & Harvest', 'Animal operations', 'register', 'event', leadRoles, ['Fish']),
  form('33', 'Apiary Hive Record', 'Animal operations', 'inspection', 'event', fieldRoles, ['Apiary']),
  form('34', 'Animal Movement & Quarantine', 'Animal operations', 'inspection', 'event', leadRoles, ['Livestock', 'Poultry']),
  form('35', 'Mortality & Disposal Record', 'Animal operations', 'event', 'event', fieldRoles, ['Livestock', 'Poultry', 'Fish'], true),
  form('36', 'Preventive Animal Health', 'Animal operations', 'review', 'scheduled', leadRoles, ['Livestock', 'Poultry', 'Fish']),
  form('37', 'Employee Attendance & Allocation', 'Management & workforce', 'register', 'daily', leadRoles, ['All farm'], true),
  form('38', 'Farm Manager Weekly Review', 'Management & workforce', 'review', 'weekly', ['manager', 'owner']),
]

export const roleLabels: Record<QhseRole, string> = {
  worker: 'Worker / specialist', supervisor: 'Enterprise supervisor', qhse: 'QHSE lead', manager: 'Farm manager', owner: 'CEO / owner',
}

export function canAccessForm(definition: QhseFormDefinition, role: QhseRole) {
  return role === 'owner' || role === 'manager' || role === 'qhse' || definition.assignedRoles.includes(role)
}

export function formById(id: string) { return qhseForms.find(item => item.id === id) }

export function originalFormUrl(definition: QhseFormDefinition) {
  return `/qhse-forms/${definition.sourceFile}`
}
