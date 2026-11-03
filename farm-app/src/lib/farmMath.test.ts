import { describe, expect, it } from 'vitest'
import { acceptedOutput } from './farmMath'

describe('acceptedOutput', () => {
  it('subtracts rejected produce from harvested produce', () => {
    expect(acceptedOutput(1240, 35)).toBe(1205)
  })

  it('never reports a negative accepted output', () => {
    expect(acceptedOutput(20, 25)).toBe(0)
  })
})
