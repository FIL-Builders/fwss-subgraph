// Types matching schemas/schema.reliability.graphql

// Enums

export enum ProviderStatus {
  REGISTERED = 'REGISTERED',
  APPROVED = 'APPROVED',
  UNAPPROVED = 'UNAPPROVED',
  REMOVED = 'REMOVED',
}

export enum DataSetStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
  TERMINATED = 'TERMINATED',
}

export enum OrderDirection {
  asc = 'asc',
  desc = 'desc',
}

// Entity Types

export interface Provider {
  id: string
  providerId: string
  serviceProvider: string
  payee: string
  name: string
  description: string
  status: ProviderStatus
  dataSets?: DataSet[]
  pdpOffering?: PDPOffering | null

  // Lifecycle
  registeredAt: string | null
  approvedAt: string | null
  removedAt: string | null
  createdAt: string
  lastActiveAt: string

  // Datasets
  datasetsCreated: string
  datasetsDeleted: string
  activeDatasets: string
  totalBytesStored: string

  // Pieces
  piecesStored: string
  piecesDeleted: string
  activePieces: string

  // Proving
  provenPeriods: string
  faultedPeriods: string

  // Statistics
  avgDataSetSize: string
  avgPiecesPerDataset: string
  provingReliability: string

  // Recent window
  recentProvenPeriods: string
  recentFaultedPeriods: string
  recentPiecesAdded: string
  recentPiecesDeleted: string
  recentDatasetsCreated: string
  recentDatasetsDeleted: string
  windowStartBlock: string
  windowStartTime: string
  recentProvingReliability: string
}

export interface DataSet {
  id: string
  provider?: Provider
  providerId: string
  status: DataSetStatus

  // Lifecycle
  createdAt: string
  createdBlock: string
  lastActiveAt: string

  // Metadata
  metadataKeys: string[] | null
  metadataValues: string[] | null

  // Pieces
  piecesAdded: string
  piecesRemoved: string
  activePieces: string
  sizeInBytes: string

  // Proving
  provenPeriods: string
  faultedPeriods: string
  provingReliability: string
}

export interface PDPOffering {
  id: string
  productType: string
  serviceURL: string | null
  minPieceSize: string | null
  maxPieceSize: string | null
  pricePerTibDay: string | null
  minProvingPeriod: string | null
  location: string | null
  paymentToken: string | null
  ipniPiece: boolean
  ipniIpfs: boolean
  ipniPeerId: string | null
  serviceStatus: string | null
  capacityTib: string | null
  isActive: boolean
}

// Query Input Types

export interface PaginationInput {
  first?: number
  skip?: number
}

export interface OrderByInput<T extends string> {
  orderBy?: T
  orderDirection?: OrderDirection
}

// Provider filters

export interface ProviderWhereInput {
  id?: string
  id_not?: string
  id_in?: string[]
  id_not_in?: string[]
  providerId?: string
  providerId_gt?: string
  providerId_lt?: string
  providerId_gte?: string
  providerId_lte?: string
  serviceProvider?: string
  serviceProvider_not?: string
  serviceProvider_in?: string[]
  payee?: string
  payee_not?: string
  payee_in?: string[]
  name?: string
  name_contains?: string
  name_starts_with?: string
  status?: ProviderStatus
  status_not?: ProviderStatus
  status_in?: ProviderStatus[]
  totalBytesStored_gt?: string
  totalBytesStored_gte?: string
  totalBytesStored_lt?: string
  totalBytesStored_lte?: string
  datasetsCreated_gt?: string
  datasetsCreated_gte?: string
  activeDatasets_gt?: string
  activeDatasets_gte?: string
  activePieces_gt?: string
  activePieces_gte?: string
  faultedPeriods_gt?: string
  faultedPeriods_gte?: string
  provenPeriods_gt?: string
  provenPeriods_gte?: string
  createdAt_gt?: string
  createdAt_gte?: string
  createdAt_lt?: string
  createdAt_lte?: string
}

export type ProviderOrderBy =
  | 'id'
  | 'providerId'
  | 'serviceProvider'
  | 'payee'
  | 'name'
  | 'status'
  | 'datasetsCreated'
  | 'activeDatasets'
  | 'totalBytesStored'
  | 'activePieces'
  | 'provenPeriods'
  | 'faultedPeriods'
  | 'provingReliability'
  | 'recentProvingReliability'
  | 'createdAt'
  | 'lastActiveAt'

// DataSet filters

export interface DataSetWhereInput {
  id?: string
  id_not?: string
  id_in?: string[]
  id_not_in?: string[]
  provider?: string
  provider_?: ProviderWhereInput
  providerId?: string
  status?: DataSetStatus
  status_not?: DataSetStatus
  status_in?: DataSetStatus[]
  sizeInBytes_gt?: string
  sizeInBytes_gte?: string
  sizeInBytes_lt?: string
  sizeInBytes_lte?: string
  activePieces_gt?: string
  activePieces_gte?: string
  faultedPeriods_gt?: string
  faultedPeriods_gte?: string
  provenPeriods_gt?: string
  provenPeriods_gte?: string
  createdAt_gt?: string
  createdAt_gte?: string
  createdAt_lt?: string
  createdAt_lte?: string
}

export type DataSetOrderBy =
  | 'id'
  | 'providerId'
  | 'status'
  | 'sizeInBytes'
  | 'activePieces'
  | 'piecesAdded'
  | 'piecesRemoved'
  | 'provenPeriods'
  | 'faultedPeriods'
  | 'provingReliability'
  | 'createdAt'
  | 'lastActiveAt'

// Query Response Types

export interface GraphQLResponse<T> {
  data?: T
  errors?: GraphQLError[]
}

export interface GraphQLError {
  message: string
  locations?: { line: number; column: number }[]
  path?: (string | number)[]
  extensions?: Record<string, unknown>
}
