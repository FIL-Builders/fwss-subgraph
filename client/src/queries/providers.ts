import {
  PROVIDER_FIELDS,
  PROVIDER_SUMMARY_FIELDS,
  DATASET_SUMMARY_FIELDS,
  PDP_OFFERING_FIELDS,
} from './fragments.js'

// Get all providers with pagination and filtering
export const GET_PROVIDERS = `
  query GetProviders(
    $first: Int
    $skip: Int
    $orderBy: Provider_orderBy
    $orderDirection: OrderDirection
    $where: Provider_filter
  ) {
    providers(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: $where
    ) {
      ${PROVIDER_SUMMARY_FIELDS}
    }
  }
`

// Get a single provider by ID with full details
export const GET_PROVIDER = `
  query GetProvider($id: ID!) {
    provider(id: $id) {
      ${PROVIDER_FIELDS}
    }
  }
`

// Get provider with their data sets
export const GET_PROVIDER_WITH_DATASETS = `
  query GetProviderWithDataSets(
    $id: ID!
    $datasetsFirst: Int
    $datasetsSkip: Int
    $datasetsOrderBy: DataSet_orderBy
    $datasetsOrderDirection: OrderDirection
  ) {
    provider(id: $id) {
      ${PROVIDER_FIELDS}
      dataSets(
        first: $datasetsFirst
        skip: $datasetsSkip
        orderBy: $datasetsOrderBy
        orderDirection: $datasetsOrderDirection
      ) {
        ${DATASET_SUMMARY_FIELDS}
      }
    }
  }
`

// Get provider with their PDP offering
export const GET_PROVIDER_WITH_OFFERING = `
  query GetProviderWithOffering($id: ID!) {
    provider(id: $id) {
      ${PROVIDER_FIELDS}
      pdpOffering {
        ${PDP_OFFERING_FIELDS}
      }
    }
  }
`

// Get providers by status
export const GET_PROVIDERS_BY_STATUS = `
  query GetProvidersByStatus(
    $status: ProviderStatus!
    $first: Int
    $skip: Int
    $orderBy: Provider_orderBy
    $orderDirection: OrderDirection
  ) {
    providers(
      where: { status: $status }
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      ${PROVIDER_SUMMARY_FIELDS}
    }
  }
`

// Get providers with minimum stored bytes
export const GET_PROVIDERS_BY_SIZE = `
  query GetProvidersBySize(
    $minSize: BigInt!
    $first: Int
    $skip: Int
  ) {
    providers(
      where: { totalBytesStored_gte: $minSize }
      first: $first
      skip: $skip
      orderBy: totalBytesStored
      orderDirection: desc
    ) {
      ${PROVIDER_SUMMARY_FIELDS}
    }
  }
`

// Get provider by service provider address
export const GET_PROVIDER_BY_ADDRESS = `
  query GetProviderByAddress($address: Bytes!) {
    providers(where: { serviceProvider: $address }, first: 1) {
      ${PROVIDER_FIELDS}
    }
  }
`

// Get providers ranked by active datasets
export const GET_TOP_PROVIDERS_BY_DATASETS = `
  query GetTopProvidersByDataSets($first: Int) {
    providers(
      first: $first
      orderBy: activeDatasets
      orderDirection: desc
    ) {
      ${PROVIDER_SUMMARY_FIELDS}
    }
  }
`

// Get providers with fault history
export const GET_PROVIDERS_WITH_FAULTS = `
  query GetProvidersWithFaults($first: Int, $skip: Int) {
    providers(
      where: { faultedPeriods_gt: "0" }
      first: $first
      skip: $skip
      orderBy: faultedPeriods
      orderDirection: desc
    ) {
      ${PROVIDER_SUMMARY_FIELDS}
      faultedPeriods
      provenPeriods
      provingReliability
    }
  }
`

// Search providers by name
export const SEARCH_PROVIDERS_BY_NAME = `
  query SearchProvidersByName($nameContains: String!, $first: Int) {
    providers(
      where: { name_contains: $nameContains }
      first: $first
      orderBy: name
      orderDirection: asc
    ) {
      ${PROVIDER_SUMMARY_FIELDS}
    }
  }
`
