import { describe, expect, it } from 'vitest'
import { FARM_DOCUMENT_MAX_BYTES, farmDocumentPath, validateFarmDocument } from './storage'

describe('protected farm document storage', () => {
  it('rejects oversized and unsupported files before upload', () => {
    expect(validateFarmDocument({ name: 'evidence.exe', type: 'application/x-msdownload', size: 10 })).toContain('not supported')
    expect(validateFarmDocument({ name: 'large.pdf', type: 'application/pdf', size: FARM_DOCUMENT_MAX_BYTES + 1 })).toContain('20 MB')
  })

  it('accepts supported evidence files', () => {
    expect(validateFarmDocument({ name: 'inspection.jpg', type: 'image/jpeg', size: 1024 })).toBeNull()
    expect(validateFarmDocument({ name: 'receipt.pdf', type: 'application/pdf', size: 1024 })).toBeNull()
  })

  it('scopes object paths by organization, farm, module and record', () => {
    expect(farmDocumentPath({ organizationId: 'org-1', farmId: 'farm-1', module: 'qhse', recordId: 'record-1' }, 'inspection.jpg', 'token'))
      .toBe('org-1/farm-1/qhse/record-1/token.jpg')
    expect(farmDocumentPath({ organizationId: 'org-1', farmId: null, module: 'finance', recordId: 'record-2' }, 'receipt.PDF', 'token'))
      .toBe('org-1/all-farms/finance/record-2/token.pdf')
  })
})
