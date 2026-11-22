import { supabase } from './supabase'

export const FARM_DOCUMENTS_BUCKET = 'farm-documents'
export const FARM_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024

const allowedMimeTypes = [
  /^image\//,
  /^application\/pdf$/,
  /^text\/plain$/,
  /^application\/msword$/,
  /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/,
  /^application\/vnd\.ms-excel$/,
  /^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet$/,
]

export type FarmDocumentScope = {
  organizationId: string
  farmId: string | null
  module: string
  recordId: string
}

export type FarmDocumentReference = {
  bucket: typeof FARM_DOCUMENTS_BUCKET
  path: string
  name: string
  mimeType: string
  sizeBytes: number
}

function safePathSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '') || 'unknown'
}

export function validateFarmDocument(file: Pick<File, 'name' | 'type' | 'size'>) {
  if (!file.name.trim()) return 'Choose a file to upload.'
  if (file.size <= 0) return 'The selected file is empty.'
  if (file.size > FARM_DOCUMENT_MAX_BYTES) return 'Files must be 20 MB or smaller.'
  if (!allowedMimeTypes.some((pattern) => pattern.test(file.type))) return 'This file type is not supported. Use an image, PDF, Word, Excel or text file.'
  return null
}

export function farmDocumentPath(scope: FarmDocumentScope, fileName: string, token = 'upload') {
  const farm = scope.farmId ? safePathSegment(scope.farmId) : 'all-farms'
  const extension = fileName.includes('.') ? `.${fileName.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '')}` : ''
  return [safePathSegment(scope.organizationId), farm, safePathSegment(scope.module), safePathSegment(scope.recordId), `${safePathSegment(token)}${extension}`].join('/')
}

function requireStorage() {
  if (!supabase) throw new Error('Protected storage is unavailable until you sign in to Supabase.')
  return supabase
}

export async function uploadFarmDocument(scope: FarmDocumentScope, file: File): Promise<FarmDocumentReference> {
  const validation = validateFarmDocument(file)
  if (validation) throw new Error(validation)
  const client = requireStorage()
  const path = farmDocumentPath(scope, file.name, crypto.randomUUID())
  const { error } = await client.storage.from(FARM_DOCUMENTS_BUCKET).upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: false })
  if (error) throw new Error(`Unable to upload supporting document: ${error.message}`)
  return { bucket: FARM_DOCUMENTS_BUCKET, path, name: file.name, mimeType: file.type, sizeBytes: file.size }
}

export async function createFarmDocumentUrl(reference: Pick<FarmDocumentReference, 'bucket' | 'path'>, expiresIn = 3600) {
  const client = requireStorage()
  const { data, error } = await client.storage.from(reference.bucket).createSignedUrl(reference.path, expiresIn)
  if (error || !data?.signedUrl) throw new Error(`Unable to open supporting document: ${error?.message ?? 'signed URL unavailable'}`)
  return data.signedUrl
}

export async function removeFarmDocument(reference: Pick<FarmDocumentReference, 'bucket' | 'path'>) {
  const client = requireStorage()
  const { error } = await client.storage.from(reference.bucket).remove([reference.path])
  if (error) throw new Error(`Unable to remove supporting document: ${error.message}`)
}
