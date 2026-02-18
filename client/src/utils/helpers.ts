import type {
  PaginationInput,
  OrderByInput,
  ProviderWhereInput,
  DataSetWhereInput,
} from '../types/index.js'

/**
 * Builds GraphQL variables object from query options
 */
export function buildQueryVariables<TOrderBy extends string>(options: {
  pagination?: PaginationInput
  orderBy?: OrderByInput<TOrderBy>
  where?: object
}): Record<string, unknown> {
  const variables: Record<string, unknown> = {}

  if (options.pagination) {
    if (options.pagination.first !== undefined) {
      variables.first = options.pagination.first
    }
    if (options.pagination.skip !== undefined) {
      variables.skip = options.pagination.skip
    }
  }

  if (options.orderBy) {
    if (options.orderBy.orderBy !== undefined) {
      variables.orderBy = options.orderBy.orderBy
    }
    if (options.orderBy.orderDirection !== undefined) {
      variables.orderDirection = options.orderBy.orderDirection
    }
  }

  if (options.where) {
    variables.where = options.where
  }

  return variables
}

/**
 * Converts a hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16)
  }
  return bytes
}

/**
 * Converts bytes to a hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Formats a BigInt string to a human-readable format with decimals
 */
export function formatBigInt(value: string, decimals = 18): string {
  if (!value || value === '0') return '0'

  const padded = value.padStart(decimals + 1, '0')
  const intPart = padded.slice(0, -decimals) || '0'
  const decPart = padded.slice(-decimals).replace(/0+$/, '')

  return decPart ? `${intPart}.${decPart}` : intPart
}

/**
 * Formats bytes to human-readable size
 */
export function formatBytes(bytes: string | number): string {
  const num = typeof bytes === 'string' ? BigInt(bytes) : BigInt(bytes)
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

  let unitIndex = 0
  let size = Number(num)

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

/**
 * Formats an epoch number to a date (Filecoin epochs are 30 seconds)
 */
export function epochToDate(epoch: string | number, genesisTime = 1598306400): Date {
  const epochNum = typeof epoch === 'string' ? parseInt(epoch, 10) : epoch
  const timestamp = genesisTime + epochNum * 30
  return new Date(timestamp * 1000)
}

/**
 * Converts a date to Filecoin epoch
 */
export function dateToEpoch(date: Date, genesisTime = 1598306400): number {
  const timestamp = Math.floor(date.getTime() / 1000)
  return Math.floor((timestamp - genesisTime) / 30)
}

/**
 * Gets the current Filecoin epoch
 */
export function getCurrentEpoch(genesisTime = 1598306400): number {
  return dateToEpoch(new Date(), genesisTime)
}

/**
 * Truncates an address for display
 */
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Validates an Ethereum/Filecoin address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Validates a hex bytes string
 */
export function isValidBytes(value: string): boolean {
  return /^0x[a-fA-F0-9]*$/.test(value)
}

/**
 * Sleep utility for rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry utility with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffMultiplier?: number
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
  } = options

  let lastError: Error | undefined
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries) {
        break
      }

      await sleep(delay)
      delay = Math.min(delay * backoffMultiplier, maxDelay)
    }
  }

  throw lastError
}

/**
 * Paginates through all results
 */
export async function paginateAll<T>(
  fetchPage: (skip: number, first: number) => Promise<T[]>,
  options: {
    pageSize?: number
    maxPages?: number
  } = {}
): Promise<T[]> {
  const { pageSize = 100, maxPages = 100 } = options
  const results: T[] = []
  let page = 0

  while (page < maxPages) {
    const items = await fetchPage(page * pageSize, pageSize)
    results.push(...items)

    if (items.length < pageSize) {
      break
    }

    page++
  }

  return results
}

/**
 * Creates a metadata object from keys and values arrays
 */
export function parseMetadata(
  keys: string[] | null,
  values: string[] | null
): Record<string, string> {
  if (!keys || !values || keys.length !== values.length) {
    return {}
  }

  const metadata: Record<string, string> = {}
  for (let i = 0; i < keys.length; i++) {
    metadata[keys[i]] = values[i]
  }
  return metadata
}

/**
 * Flattens metadata object to keys and values arrays
 */
export function flattenMetadata(
  metadata: Record<string, string>
): { keys: string[]; values: string[] } {
  const keys = Object.keys(metadata)
  const values = keys.map(k => metadata[k])
  return { keys, values }
}

// Type guards
export function isProviderWhereInput(obj: unknown): obj is ProviderWhereInput {
  return typeof obj === 'object' && obj !== null
}

export function isDataSetWhereInput(obj: unknown): obj is DataSetWhereInput {
  return typeof obj === 'object' && obj !== null
}
