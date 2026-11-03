import { describe, expect, it } from 'vitest'
import { daysUntil, expectedHarvestDate, plantingProgress } from './cropMath'

describe('crop lifecycle calculations', () => {
  it('calculates an expected harvest date from maturity days', () => {
    expect(expectedHarvestDate('2026-09-06', 120)).toBe('2027-01-04')
  })

  it('bounds planting progress between zero and one hundred', () => {
    expect(plantingProgress('2026-09-01', '2027-01-01', '2026-11-01')).toBe(50)
    expect(plantingProgress('2026-09-01', '2027-01-01', '2027-03-01')).toBe(100)
  })

  it('reports days remaining to a farm event', () => {
    expect(daysUntil('2026-11-11')).toBe(10)
  })
})
