import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { calibration as calibrationChain, mainnet as mainnetChain } from '@filoz/synapse-core/chains'

const __dirname = dirname(fileURLToPath(import.meta.url))

const NETWORK_NAMES: Record<string, string> = {
  mainnet: 'filecoin',
  calibration: 'filecoin-testnet',
}

// Maps @filoz/synapse-core contract keys to our template contract names
const CONTRACT_MAPPING: Record<string, string> = {
  pdp: 'PDPVerifier',
  fwss: 'FilecoinWarmStorageService',
  serviceProviderRegistry: 'ServiceProviderRegistry',
  usdfc: 'USDFCToken',
}

const DEFAULT_START_BLOCKS: Record<string, Record<string, number>> = {
  mainnet: {
    PDPVerifier: 5445000,
    ServiceProviderRegistry: 5445000,
    FilecoinWarmStorageService: 5445000,
    USDFCToken: 5445000,
  },
  calibration: {
    PDPVerifier: 2988297,
    ServiceProviderRegistry: 2988311,
    FilecoinWarmStorageService: 2988329,
    USDFCToken: 2988000,
  },
}

interface ContractConfig {
  address: string
  startBlock: number
}

export interface NetworkConfig {
  name: string
  [key: string]: string | ContractConfig | undefined
}

function getChainContracts(network: string): any {
  if (network === 'mainnet') return mainnetChain.contracts
  if (network === 'calibration') return calibrationChain.contracts
  return null
}

function loadStartBlockOverrides(network: string): Record<string, number> | null {
  const overridesPath = join(__dirname, '..', '..', 'config', 'start-blocks.json')
  try {
    const content = readFileSync(overridesPath, 'utf8')
    const overrides = JSON.parse(content) as Record<string, Record<string, number>>
    return overrides[network] ?? null
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }

    console.error(
      `Error: Failed to load start block overrides from ${overridesPath}: ${(error as Error).message}`,
    )
    process.exit(1)
  }
}

function saveAbi(contractName: string, abi: unknown[]): void {
  const abiDir = join(__dirname, '..', '..', 'abi')
  const abiPath = join(abiDir, `${contractName}.abi.json`)
  try {
    mkdirSync(abiDir, { recursive: true })
    writeFileSync(abiPath, JSON.stringify(abi, null, 2))
  } catch (error) {
    console.error(`Error: Failed to save ABI for ${contractName}: ${(error as Error).message}`)
    process.exit(1)
  }
}

export function loadNetworkConfig(network = 'calibration'): NetworkConfig {
  if (network !== 'mainnet' && network !== 'calibration') {
    console.error(`Error: Unknown network '${network}'. Available: mainnet, calibration`)
    process.exit(1)
  }

  console.error(`Loading contract addresses from @filoz/synapse-core for ${network}...`)

  const contracts = getChainContracts(network)
  if (!contracts) {
    console.error(`Error: No contracts found for network '${network}' in @filoz/synapse-core`)
    process.exit(1)
  }

  const startBlockOverrides = loadStartBlockOverrides(network)
  const defaultStartBlocks = DEFAULT_START_BLOCKS[network] || {}

  const config: NetworkConfig = {
    name: NETWORK_NAMES[network],
  }

  for (const [contractKey, templateKey] of Object.entries(CONTRACT_MAPPING)) {
    const contract = contracts[contractKey]
    if (!contract || !contract.address) {
      console.error(`Error: Missing '${contractKey}' contract in @filoz/synapse-core for ${network}`)
      process.exit(1)
    }

    const startBlock = startBlockOverrides?.[templateKey] ?? defaultStartBlocks[templateKey] ?? 0

    config[templateKey] = {
      address: contract.address,
      startBlock,
    }

    saveAbi(templateKey, contract.abi)
  }

  console.error(`✅ Loaded contract addresses and ABIs from @filoz/synapse-core`)
  return config
}
