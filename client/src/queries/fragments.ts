// GraphQL fragments for reusable field selections

export const PROVIDER_FIELDS = `
  id
  providerId
  serviceProvider
  payee
  name
  description
  status
  registeredAt
  approvedAt
  removedAt
  createdAt
  lastActiveAt
  datasetsCreated
  datasetsDeleted
  activeDatasets
  totalBytesStored
  piecesStored
  piecesDeleted
  activePieces
  provenPeriods
  faultedPeriods
  avgDataSetSize
  avgPiecesPerDataset
  provingReliability
  recentProvenPeriods
  recentFaultedPeriods
  recentPiecesAdded
  recentPiecesDeleted
  recentDatasetsCreated
  recentDatasetsDeleted
  windowStartBlock
  windowStartTime
  recentProvingReliability
`

export const PROVIDER_SUMMARY_FIELDS = `
  id
  providerId
  serviceProvider
  payee
  name
  status
  activeDatasets
  activePieces
  totalBytesStored
  provingReliability
  createdAt
  lastActiveAt
`

export const DATASET_FIELDS = `
  id
  providerId
  status
  createdAt
  createdBlock
  lastActiveAt
  metadataKeys
  metadataValues
  piecesAdded
  piecesRemoved
  activePieces
  sizeInBytes
  provenPeriods
  faultedPeriods
  provingReliability
`

export const DATASET_SUMMARY_FIELDS = `
  id
  providerId
  status
  activePieces
  sizeInBytes
  provenPeriods
  faultedPeriods
  provingReliability
  createdAt
  lastActiveAt
`

export const PDP_OFFERING_FIELDS = `
  id
  productType
  serviceURL
  minPieceSize
  maxPieceSize
  pricePerTibDay
  minProvingPeriod
  location
  paymentToken
  ipniPiece
  ipniIpfs
  ipniPeerId
  serviceStatus
  capacityTib
  isActive
`
