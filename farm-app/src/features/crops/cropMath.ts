const DAY_MS = 86_400_000

export function expectedHarvestDate(plantedOn: string, maturityDays: number) {
  const date = new Date(`${plantedOn}T12:00:00Z`)
  if (Number.isNaN(date.getTime()) || maturityDays <= 0) return ''
  date.setUTCDate(date.getUTCDate() + maturityDays)
  return date.toISOString().slice(0, 10)
}

export function plantingProgress(plantedOn: string, expectedHarvest: string, today = '2026-11-01') {
  const start = new Date(`${plantedOn}T00:00:00Z`).getTime()
  const end = new Date(`${expectedHarvest}T00:00:00Z`).getTime()
  const current = new Date(`${today}T00:00:00Z`).getTime()
  if (![start, end, current].every(Number.isFinite) || end <= start) return 0
  return Math.min(100, Math.max(0, Math.round(((current - start) / (end - start)) * 100)))
}

export function daysUntil(date: string, today = '2026-11-01') {
  return Math.ceil((new Date(`${date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / DAY_MS)
}
