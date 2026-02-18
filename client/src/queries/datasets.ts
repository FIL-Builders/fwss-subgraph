import {
  DATASET_FIELDS,
  DATASET_SUMMARY_FIELDS,
  PROVIDER_SUMMARY_FIELDS,
} from './fragments.js'

// Get all data sets with pagination and filtering
export const GET_DATASETS = `
  query GetDataSets(
    $first: Int
    $skip: Int
    $orderBy: DataSet_orderBy
    $orderDirection: OrderDirection
    $where: DataSet_filter
  ) {
    dataSets(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: $where
    ) {
      ${DATASET_SUMMARY_FIELDS}
      provider {
        id
        serviceProvider
        name
      }
    }
  }
`

// Get a single data set by ID with full details
export const GET_DATASET = `
  query GetDataSet($id: ID!) {
    dataSet(id: $id) {
      ${DATASET_FIELDS}
      provider {
        ${PROVIDER_SUMMARY_FIELDS}
      }
    }
  }
`

// Get data sets by status
export const GET_DATASETS_BY_STATUS = `
  query GetDataSetsByStatus(
    $status: DataSetStatus!
    $first: Int
    $skip: Int
    $orderBy: DataSet_orderBy
    $orderDirection: OrderDirection
  ) {
    dataSets(
      where: { status: $status }
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      ${DATASET_SUMMARY_FIELDS}
      provider {
        id
        serviceProvider
        name
      }
    }
  }
`

// Get active data sets
export const GET_ACTIVE_DATASETS = `
  query GetActiveDataSets(
    $first: Int
    $skip: Int
    $orderBy: DataSet_orderBy
    $orderDirection: OrderDirection
  ) {
    dataSets(
      where: { status: ACTIVE }
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      ${DATASET_SUMMARY_FIELDS}
      provider {
        id
        serviceProvider
        name
      }
    }
  }
`

// Get data sets by provider
export const GET_DATASETS_BY_PROVIDER = `
  query GetDataSetsByProvider(
    $providerId: String!
    $first: Int
    $skip: Int
    $orderBy: DataSet_orderBy
    $orderDirection: OrderDirection
  ) {
    dataSets(
      where: { provider: $providerId }
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      ${DATASET_SUMMARY_FIELDS}
    }
  }
`

// Get large data sets by minimum size
export const GET_LARGE_DATASETS = `
  query GetLargeDataSets(
    $minSize: BigInt!
    $first: Int
    $skip: Int
  ) {
    dataSets(
      where: { sizeInBytes_gte: $minSize, status: ACTIVE }
      first: $first
      skip: $skip
      orderBy: sizeInBytes
      orderDirection: desc
    ) {
      ${DATASET_SUMMARY_FIELDS}
      provider {
        id
        serviceProvider
        name
      }
    }
  }
`

// Get data sets with faults
export const GET_FAULTED_DATASETS = `
  query GetFaultedDataSets($first: Int, $skip: Int) {
    dataSets(
      where: { faultedPeriods_gt: "0" }
      first: $first
      skip: $skip
      orderBy: faultedPeriods
      orderDirection: desc
    ) {
      ${DATASET_SUMMARY_FIELDS}
      faultedPeriods
      provenPeriods
      provingReliability
      provider {
        id
        serviceProvider
        name
      }
    }
  }
`
