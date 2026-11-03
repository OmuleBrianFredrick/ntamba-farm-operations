export const productionMetrics = [
  { label: 'Banana', value: '1,240', unit: 'kg', trend: '↑ 12%', note: 'vs yesterday' },
  { label: 'Coffee', value: '680', unit: 'kg', trend: '↑ 8%', note: 'vs yesterday' },
  { label: 'Milk', value: '426', unit: 'L', trend: '↑ 5%', note: 'vs yesterday' },
  { label: 'Eggs', value: '1,860', unit: 'eggs', trend: '↑ 3%', note: 'vs yesterday' },
  { label: 'Fish feed', value: '94', unit: 'kg', trend: '↓ 18%', note: 'vs yesterday', down: true },
  { label: 'Honey', value: '0', unit: 'kg', trend: '—', note: 'No change' },
]

export const workProgress = [
  { enterprise: 'Banana', activity: 'Harvesting', team: 'Field Team A', output: '1,240 kg', status: 'Complete', style: '' },
  { enterprise: 'Coffee', activity: 'Picking round', team: 'Field Team B', output: '680 kg', status: 'In progress', style: 'progress' },
  { enterprise: 'Dairy', activity: 'Morning milking', team: 'Dairy Team', output: '426 L', status: 'Verified', style: '' },
  { enterprise: 'Poultry', activity: 'Egg collection', team: 'Poultry Team', output: '1,860 eggs', status: 'Awaiting review', style: 'review' },
]

export const transactions = [
  { time: '09:14', type: 'Receipt', description: 'Coffee sales - Kigezi Traders', amount: '+ 1,800,000', incoming: true },
  { time: '08:26', type: 'Payment', description: 'Animal feed - Farm Supplies Ltd', amount: '- 520,000', incoming: false },
  { time: '07:51', type: 'Receipt', description: 'Milk sales - Mbarara Dairy', amount: '+ 760,000', incoming: true },
]
