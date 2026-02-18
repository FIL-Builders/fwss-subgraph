import type {
  Provider,
  DataSet,
  GraphQLError,
  OrderDirection,
  ProviderWhereInput,
  ProviderOrderBy,
  DataSetWhereInput,
  DataSetOrderBy,
  ProviderStatus,
  DataSetStatus,
} from './types/index.js'

import * as queries from './queries/index.js'
import { buildQueryVariables, retry, paginateAll } from './utils/helpers.js'

export interface WarmStorageClientConfig {
  /** The Goldsky subgraph URL */
  url: string
  /** Optional fetch implementation for custom environments */
  fetch?: typeof fetch
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Number of retries on failure (default: 3) */
  retries?: number
  /** Optional headers to include with each request */
  headers?: Record<string, string>
}

export class WarmStorageClientError extends Error {
  constructor(
    message: string,
    public readonly errors?: GraphQLError[],
    public readonly status?: number
  ) {
    super(message)
    this.name = 'WarmStorageClientError'
  }
}

export class WarmStorageClient {
  private readonly url: string
  private readonly fetchFn: typeof fetch
  private readonly timeout: number
  private readonly retries: number
  private readonly headers: Record<string, string>

  constructor(config: WarmStorageClientConfig) {
    this.url = config.url
    this.fetchFn = config.fetch ?? globalThis.fetch
    this.timeout = config.timeout ?? 30000
    this.retries = config.retries ?? 3
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    }
  }

  /** Execute a raw GraphQL query */
  async query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const execute = async (): Promise<T> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      try {
        const response = await this.fetchFn(this.url, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({ query, variables }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new WarmStorageClientError(
            `HTTP error: ${response.status} ${response.statusText}`,
            undefined,
            response.status
          )
        }

        const result = (await response.json()) as { data?: T; errors?: GraphQLError[] }

        if (result.errors && result.errors.length > 0) {
          throw new WarmStorageClientError(
            `GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`,
            result.errors
          )
        }

        if (!result.data) {
          throw new WarmStorageClientError('No data returned from query')
        }

        return result.data
      } catch (error) {
        clearTimeout(timeoutId)

        if (error instanceof WarmStorageClientError) {
          throw error
        }

        if ((error as Error).name === 'AbortError') {
          throw new WarmStorageClientError('Request timeout')
        }

        throw new WarmStorageClientError(
          `Request failed: ${(error as Error).message}`
        )
      }
    }

    return retry(execute, {
      maxRetries: this.retries,
      initialDelay: 1000,
      backoffMultiplier: 2,
    })
  }

  // ---- Provider Queries ----

  /** Get providers with pagination and filtering */
  async getProviders(options: {
    first?: number
    skip?: number
    orderBy?: ProviderOrderBy
    orderDirection?: OrderDirection
    where?: ProviderWhereInput
  } = {}): Promise<Provider[]> {
    const variables = buildQueryVariables({
      pagination: { first: options.first, skip: options.skip },
      orderBy: { orderBy: options.orderBy, orderDirection: options.orderDirection },
      where: options.where,
    })

    const result = await this.query<{ providers: Provider[] }>(
      queries.GET_PROVIDERS,
      variables
    )
    return result.providers
  }

  /** Get a single provider by ID */
  async getProvider(id: string): Promise<Provider | null> {
    const result = await this.query<{ provider: Provider | null }>(
      queries.GET_PROVIDER,
      { id }
    )
    return result.provider
  }

  /** Get a provider with their data sets */
  async getProviderWithDataSets(
    id: string,
    options: {
      datasetsFirst?: number
      datasetsSkip?: number
      datasetsOrderBy?: DataSetOrderBy
      datasetsOrderDirection?: OrderDirection
    } = {}
  ): Promise<Provider | null> {
    const result = await this.query<{ provider: Provider | null }>(
      queries.GET_PROVIDER_WITH_DATASETS,
      { id, ...options }
    )
    return result.provider
  }

  /** Get a provider with their PDP offering */
  async getProviderWithOffering(id: string): Promise<Provider | null> {
    const result = await this.query<{ provider: Provider | null }>(
      queries.GET_PROVIDER_WITH_OFFERING,
      { id }
    )
    return result.provider
  }

  /** Get providers by status */
  async getProvidersByStatus(
    status: ProviderStatus,
    options: {
      first?: number
      skip?: number
      orderBy?: ProviderOrderBy
      orderDirection?: OrderDirection
    } = {}
  ): Promise<Provider[]> {
    const result = await this.query<{ providers: Provider[] }>(
      queries.GET_PROVIDERS_BY_STATUS,
      { status, ...options }
    )
    return result.providers
  }

  /** Get providers with minimum stored bytes */
  async getProvidersBySize(
    minSize: string,
    options: { first?: number; skip?: number } = {}
  ): Promise<Provider[]> {
    const result = await this.query<{ providers: Provider[] }>(
      queries.GET_PROVIDERS_BY_SIZE,
      { minSize, ...options }
    )
    return result.providers
  }

  /** Get provider by service provider address */
  async getProviderByAddress(address: string): Promise<Provider | null> {
    const result = await this.query<{ providers: Provider[] }>(
      queries.GET_PROVIDER_BY_ADDRESS,
      { address }
    )
    return result.providers[0] ?? null
  }

  /** Get top providers by active datasets */
  async getTopProvidersByDataSets(first = 10): Promise<Provider[]> {
    const result = await this.query<{ providers: Provider[] }>(
      queries.GET_TOP_PROVIDERS_BY_DATASETS,
      { first }
    )
    return result.providers
  }

  /** Get providers with fault history */
  async getProvidersWithFaults(options: {
    first?: number
    skip?: number
  } = {}): Promise<Provider[]> {
    const result = await this.query<{ providers: Provider[] }>(
      queries.GET_PROVIDERS_WITH_FAULTS,
      options
    )
    return result.providers
  }

  /** Search providers by name */
  async searchProvidersByName(
    nameContains: string,
    first = 10
  ): Promise<Provider[]> {
    const result = await this.query<{ providers: Provider[] }>(
      queries.SEARCH_PROVIDERS_BY_NAME,
      { nameContains, first }
    )
    return result.providers
  }

  // ---- DataSet Queries ----

  /** Get data sets with pagination and filtering */
  async getDataSets(options: {
    first?: number
    skip?: number
    orderBy?: DataSetOrderBy
    orderDirection?: OrderDirection
    where?: DataSetWhereInput
  } = {}): Promise<DataSet[]> {
    const variables = buildQueryVariables({
      pagination: { first: options.first, skip: options.skip },
      orderBy: { orderBy: options.orderBy, orderDirection: options.orderDirection },
      where: options.where,
    })

    const result = await this.query<{ dataSets: DataSet[] }>(
      queries.GET_DATASETS,
      variables
    )
    return result.dataSets
  }

  /** Get a single data set by ID */
  async getDataSet(id: string): Promise<DataSet | null> {
    const result = await this.query<{ dataSet: DataSet | null }>(
      queries.GET_DATASET,
      { id }
    )
    return result.dataSet
  }

  /** Get data sets by status */
  async getDataSetsByStatus(
    status: DataSetStatus,
    options: {
      first?: number
      skip?: number
      orderBy?: DataSetOrderBy
      orderDirection?: OrderDirection
    } = {}
  ): Promise<DataSet[]> {
    const result = await this.query<{ dataSets: DataSet[] }>(
      queries.GET_DATASETS_BY_STATUS,
      { status, ...options }
    )
    return result.dataSets
  }

  /** Get active data sets */
  async getActiveDataSets(options: {
    first?: number
    skip?: number
    orderBy?: DataSetOrderBy
    orderDirection?: OrderDirection
  } = {}): Promise<DataSet[]> {
    const result = await this.query<{ dataSets: DataSet[] }>(
      queries.GET_ACTIVE_DATASETS,
      options
    )
    return result.dataSets
  }

  /** Get data sets by provider ID */
  async getDataSetsByProvider(
    providerId: string,
    options: {
      first?: number
      skip?: number
      orderBy?: DataSetOrderBy
      orderDirection?: OrderDirection
    } = {}
  ): Promise<DataSet[]> {
    const result = await this.query<{ dataSets: DataSet[] }>(
      queries.GET_DATASETS_BY_PROVIDER,
      { providerId, ...options }
    )
    return result.dataSets
  }

  /** Get large data sets by minimum size */
  async getLargeDataSets(
    minSize: string,
    options: { first?: number; skip?: number } = {}
  ): Promise<DataSet[]> {
    const result = await this.query<{ dataSets: DataSet[] }>(
      queries.GET_LARGE_DATASETS,
      { minSize, ...options }
    )
    return result.dataSets
  }

  /** Get faulted data sets */
  async getFaultedDataSets(options: {
    first?: number
    skip?: number
  } = {}): Promise<DataSet[]> {
    const result = await this.query<{ dataSets: DataSet[] }>(
      queries.GET_FAULTED_DATASETS,
      options
    )
    return result.dataSets
  }

  // ---- Pagination Utilities ----

  /** Paginate through all providers */
  async paginateProviders(options: {
    orderBy?: ProviderOrderBy
    orderDirection?: OrderDirection
    where?: ProviderWhereInput
    pageSize?: number
    maxPages?: number
  } = {}): Promise<Provider[]> {
    const { pageSize = 100, maxPages = 100, ...queryOptions } = options
    return paginateAll(
      (skip, first) => this.getProviders({ ...queryOptions, first, skip }),
      { pageSize, maxPages }
    )
  }

  /** Paginate through all data sets */
  async paginateDataSets(options: {
    orderBy?: DataSetOrderBy
    orderDirection?: OrderDirection
    where?: DataSetWhereInput
    pageSize?: number
    maxPages?: number
  } = {}): Promise<DataSet[]> {
    const { pageSize = 100, maxPages = 100, ...queryOptions } = options
    return paginateAll(
      (skip, first) => this.getDataSets({ ...queryOptions, first, skip }),
      { pageSize, maxPages }
    )
  }
}
