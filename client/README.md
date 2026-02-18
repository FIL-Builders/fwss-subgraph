# FWSS Subgraph Client

A typed TypeScript client for querying the FWSS Provider Reliability subgraph. Queries 3 entities: `Provider`, `DataSet`, and `PDPOffering`.

## Installation

```bash
cd client && pnpm install && pnpm build
```

## Quick Start

```typescript
import { WarmStorageClient, OrderDirection, ProviderStatus, DataSetStatus } from '@fwss/subgraph-client'

const client = new WarmStorageClient({
  url: 'https://api.goldsky.com/api/public/PROJECT_ID/subgraphs/fwss-reliability/1.0.0/gn'
})

// Get top providers by reliability
const providers = await client.getProviders({
  orderBy: 'provingReliability',
  orderDirection: OrderDirection.desc,
  first: 10
})

// Get a provider with their datasets
const provider = await client.getProviderWithDataSets('0x1234...', {
  datasetsFirst: 20,
  datasetsOrderBy: 'provingReliability',
  datasetsOrderDirection: OrderDirection.desc
})

// Get active datasets
const dataSets = await client.getActiveDataSets({
  first: 50,
  orderBy: 'sizeInBytes',
  orderDirection: OrderDirection.desc
})
```

## Configuration

```typescript
const client = new WarmStorageClient({
  url: 'https://api.goldsky.com/api/public/...',
  fetch: customFetch,    // Optional: custom fetch implementation
  timeout: 60000,        // Optional: request timeout in ms (default: 30000)
  retries: 5,            // Optional: retry count (default: 3)
  headers: {             // Optional: custom headers
    'Authorization': 'Bearer token'
  }
})
```

## API Reference

### Provider Queries

```typescript
// List providers with filtering
const providers = await client.getProviders({
  where: { status: ProviderStatus.APPROVED },
  orderBy: 'provingReliability',
  orderDirection: OrderDirection.desc,
  first: 10
})

// Get single provider (full details)
const provider = await client.getProvider('0x1234...')

// Get provider with datasets
const withDataSets = await client.getProviderWithDataSets('0x1234...')

// Get provider with PDP offering
const withOffering = await client.getProviderWithOffering('0x1234...')

// Get providers by status
const approved = await client.getProvidersByStatus(ProviderStatus.APPROVED)

// Get providers by minimum stored bytes
const large = await client.getProvidersBySize('1000000000000') // 1TB

// Get provider by address
const provider = await client.getProviderByAddress('0x1234...')

// Get top providers by active datasets
const top = await client.getTopProvidersByDataSets(10)

// Get providers with faults
const faulted = await client.getProvidersWithFaults()

// Search by name
const searched = await client.searchProvidersByName('storage')
```

### DataSet Queries

```typescript
// List datasets with filtering
const dataSets = await client.getDataSets({
  where: { status: DataSetStatus.ACTIVE },
  orderBy: 'sizeInBytes',
  orderDirection: OrderDirection.desc,
  first: 100
})

// Get single dataset
const dataSet = await client.getDataSet('123')

// Get datasets by status
const active = await client.getDataSetsByStatus(DataSetStatus.ACTIVE)

// Get active datasets
const activeDataSets = await client.getActiveDataSets()

// Get datasets by provider
const byProvider = await client.getDataSetsByProvider('0x1234...')

// Get large datasets
const large = await client.getLargeDataSets('1000000000000') // 1TB

// Get faulted datasets
const faulted = await client.getFaultedDataSets()
```

### Raw GraphQL Queries

```typescript
const result = await client.query<{ providers: Provider[] }>(`
  query {
    providers(where: { provingReliability_gt: "0.99" }, first: 5) {
      id
      name
      provingReliability
      activeDatasets
    }
  }
`)
```

### Pagination

```typescript
// Paginate all providers
const allProviders = await client.paginateProviders({
  where: { status: ProviderStatus.APPROVED },
  orderBy: 'createdAt',
  pageSize: 100,
  maxPages: 50
})

// Paginate all datasets
const allDataSets = await client.paginateDataSets({
  where: { status: DataSetStatus.ACTIVE },
  pageSize: 100
})
```

## Utility Functions

```typescript
import {
  formatBytes,
  formatBigInt,
  epochToDate,
  dateToEpoch,
  getCurrentEpoch,
  truncateAddress,
  parseMetadata,
  hexToBytes,
  bytesToHex
} from '@fwss/subgraph-client/utils'

formatBytes('1073741824')       // "1.00 GB"
epochToDate('12345678')         // Date object
getCurrentEpoch()               // current Filecoin epoch
truncateAddress('0x1234...5678') // "0x1234...5678"
parseMetadata(['k1'], ['v1'])   // { k1: 'v1' }
```

## Types

```typescript
import type {
  Provider,
  DataSet,
  PDPOffering,
  ProviderStatus,
  DataSetStatus,
  OrderDirection,
  ProviderWhereInput,
  DataSetWhereInput,
} from '@fwss/subgraph-client'
```

## Error Handling

```typescript
import { WarmStorageClientError } from '@fwss/subgraph-client'

try {
  await client.getProviders()
} catch (error) {
  if (error instanceof WarmStorageClientError) {
    console.error('Client error:', error.message)
    console.error('GraphQL errors:', error.errors)
    console.error('HTTP status:', error.status)
  }
}
```

## License

MIT
