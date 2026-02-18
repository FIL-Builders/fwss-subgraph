# FWSS Provider Reliability Subgraph

A lightweight subgraph for tracking storage provider reliability across the Filecoin Warm Storage Service (FWSS) network. Indexes 3 smart contracts across 16 event handlers into 3 entities: `Provider`, `DataSet`, and `PDPOffering`.

## Build

```bash
# Calibration
NETWORK=calibration pnpm build

# Mainnet
NETWORK=mainnet pnpm build
```

## Deploy

```bash
# Goldsky
pnpm deploy:calibration
pnpm deploy:mainnet

# Local Graph Node
pnpm deploy-local:calibration
```

## Project Structure

```
src/
├── service-provider-registry.ts       # Provider lifecycle (register, update, remove, products)
├── filecoin-warm-storage-service.ts   # Dataset creation, service termination, provider approvals, fault records
├── pdp-verifier.ts                    # Proof challenges, piece add/remove, dataset delete, size tracking
├── reliability/
│   └── config.ts                      # Rolling window configuration (7-day)
├── utils/
│   ├── entity.ts                      # Provider/DataSet factories, PDPOffering capability decoding
│   ├── statistics.ts                  # Proving reliability and rolling window calculations
│   ├── contract-calls.ts             # On-chain lookups (provider info)
│   ├── constants.ts                   # BigInt/BigDecimal constants, contract addresses
│   └── types.ts                       # ProviderInfo, ProviderStatus, DataSetStatus
├── generated/                         # Auto-generated (do not edit)
│   └── constants.ts
schemas/
│   └── schema.reliability.graphql     # GraphQL schema (3 entities, 2 enums)
templates/
│   ├── subgraph.reliability.template.yaml
│   └── constants.template.ts
scripts/
│   ├── generate-constants.ts          # Generates src/generated/constants.ts
│   └── generate-config.ts            # Generates subgraph.yaml from template
client/                                # TypeScript client package (@fwss/subgraph-client)
```

## Schema

### Provider

Aggregated metrics per storage provider. All statistics are pre-calculated as `BigDecimal` for direct GraphQL sorting and filtering.

| Category | Fields |
|---|---|
| **Identity** | `id`, `providerId`, `serviceProvider`, `payee`, `name`, `description`, `status` |
| **Lifecycle** | `registeredAt`, `approvedAt`, `removedAt`, `createdAt`, `lastActiveAt` |
| **Datasets** | `datasetsCreated`, `datasetsDeleted`, `activeDatasets`, `totalBytesStored` |
| **Pieces** | `piecesStored`, `piecesDeleted`, `activePieces` |
| **Proving** | `provenPeriods`, `faultedPeriods` |
| **Statistics** | `avgDataSetSize`, `avgPiecesPerDataset`, `provingReliability` |
| **Recent Window** | `recentProvenPeriods`, `recentFaultedPeriods`, `recentPiecesAdded`, `recentPiecesDeleted`, `recentDatasetsCreated`, `recentDatasetsDeleted`, `recentProvingReliability` |
| **Relationships** | `dataSets` (derived), `pdpOffering` |

### DataSet

Per-dataset metrics. Caches provider address to eliminate eth_calls in PDP handlers.

| Category | Fields |
|---|---|
| **Identity** | `id`, `provider`, `providerId`, `status` |
| **Lifecycle** | `createdAt`, `createdBlock`, `lastActiveAt` |
| **Metadata** | `metadataKeys`, `metadataValues` |
| **Pieces** | `piecesAdded`, `piecesRemoved`, `activePieces`, `sizeInBytes` |
| **Proving** | `provenPeriods`, `faultedPeriods`, `provingReliability` |

Status: `ACTIVE` | `DELETED` | `TERMINATED`

### PDPOffering

Decoded PDP product capabilities from on-chain key-value pairs.

Fields: `productType`, `serviceURL`, `minPieceSize`, `maxPieceSize`, `pricePerTibDay`, `minProvingPeriod`, `location`, `paymentToken`, `ipniPiece`, `ipniIpfs`, `ipniPeerId`, `serviceStatus`, `capacityTib`, `isActive`

## Example Queries

```graphql
# Top providers by proving reliability
{
  providers(orderBy: provingReliability, orderDirection: desc, first: 10) {
    id
    name
    provingReliability
    activePieces
    activeDatasets
  }
}

# Recently active providers
{
  providers(
    where: { recentProvenPeriods_gt: 0 }
    orderBy: recentProvingReliability
    orderDirection: desc
  ) {
    id
    name
    recentProvingReliability
    recentPiecesAdded
  }
}

# Active datasets for a provider
{
  dataSets(where: { provider: "0x...", status: ACTIVE }) {
    id
    status
    activePieces
    provenPeriods
    faultedPeriods
    provingReliability
  }
}

# Terminated or deleted datasets
{
  dataSets(where: { status_in: [TERMINATED, DELETED] }) {
    id
    provider { name }
    status
    lastActiveAt
  }
}
```

## Events Handled

| Contract | Event | Effect |
|---|---|---|
| ServiceProviderRegistry | ProviderRegistered | Create Provider entity |
| ServiceProviderRegistry | ProviderInfoUpdated | Update name/description |
| ServiceProviderRegistry | ProviderRemoved | Set status REMOVED |
| ServiceProviderRegistry | ProductAdded | Create PDPOffering with decoded capabilities |
| ServiceProviderRegistry | ProductUpdated | Update PDPOffering capabilities |
| ServiceProviderRegistry | ProductRemoved | Set PDPOffering isActive=false |
| FilecoinWarmStorageService | DataSetCreated | Create DataSet, increment provider counters |
| FilecoinWarmStorageService | ProviderApproved | Set status APPROVED |
| FilecoinWarmStorageService | ProviderUnapproved | Set status UNAPPROVED |
| FilecoinWarmStorageService | FaultRecord | Increment fault counters on DataSet and Provider |
| FilecoinWarmStorageService | ServiceTerminated | Set DataSet status TERMINATED |
| PDPVerifier | PossessionProven | Increment proof counters |
| PDPVerifier | PiecesAdded | Increment piece counters on DataSet and Provider |
| PDPVerifier | PiecesRemoved | Decrement piece counters (clamped to zero) |
| PDPVerifier | DataSetDeleted | Set DataSet status DELETED, zero pieces |
| PDPVerifier | NextProvingPeriod | Update authoritative dataset size |

## Configuration

Tunable parameters live in `src/reliability/config.ts`:

- **Recent window**: 7-day rolling window for recent activity metrics

## Client

A TypeScript client package is available in `client/`. See `client/README.md` for usage.

```bash
cd client && pnpm install && pnpm build
```

## Multi-Network Setup

Network-specific contract addresses and start blocks are defined via `@filoz/synapse-core`. The build pipeline uses mustache templates to generate `subgraph.yaml` and `src/generated/constants.ts` for the target network via the `NETWORK` environment variable.

## Development

Written in AssemblyScript targeting `@graphprotocol/graph-ts`. Build requires Node.js 20.18.1+ and pnpm.

```bash
pnpm install
NETWORK=calibration pnpm build
```
