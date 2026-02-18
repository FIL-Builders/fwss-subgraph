import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chains } from '@filoz/synapse-core'

const __dirname = dirname(fileURLToPath(import.meta.url))

// RPC endpoints for reading on-chain configuration at build time
const RPC_URLS: Record<string, string> = {
  mainnet: 'https://api.node.glif.io/rpc/v1',
  calibration: 'https://api.calibration.node.glif.io/rpc/v1',
}

// Network name to subgraph network name mapping
const NETWORK_NAMES: Record<string, string> = {
  mainnet: 'filecoin',
  calibration: 'filecoin-testnet',
}

// Mapping from synapse-core contract keys to template keys
const CONTRACT_MAPPING: Record<string, string> = {
  pdp: 'PDPVerifier',
  serviceProviderRegistry: 'ServiceProviderRegistry',
  fwss: 'FilecoinWarmStorageService',
  usdfc: 'USDFCToken',
}

// Default start blocks for each network (can be overridden via environment or config)
// These represent the approximate deployment blocks for the contracts
const DEFAULT_START_BLOCKS: Record<string, Record<string, number>> = {
  mainnet: {
    PDPVerifier: 1000000,
    ServiceProviderRegistry: 1000000,
    FilecoinWarmStorageService: 1000000,
    USDFCToken: 1000000,
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

interface PDPConfig {
  maxProvingPeriod: number
  challengeWindowSize: number
  challengesPerProof: number
  initChallengeWindowStart: number
}

interface NetworkConfig {
  name: string
  pdpConfig?: PDPConfig
  [key: string]: string | ContractConfig | PDPConfig | undefined
}

/**
 * Gets contract configuration from @filoz/synapse-core
 * @param network - The network name ('mainnet' or 'calibration')
 * @returns The contracts object for the specified network
 */
function getChainContracts(network: string): any {
  if (network === 'mainnet') {
    return chains.mainnet?.contracts
  } else if (network === 'calibration') {
    return chains.calibration?.contracts
  }
  return null
}

/**
 * Loads optional start block overrides from config/start-blocks.json
 * @param network - The network name
 * @returns The start blocks object or null if not found
 */
function loadStartBlockOverrides(network: string): Record<string, number> | null {
  const overridesPath = join(__dirname, '..', '..', 'config', 'start-blocks.json')

  try {
    const content = readFileSync(overridesPath, 'utf8')
    const overrides = JSON.parse(content) as Record<string, Record<string, number>>
    return overrides[network] || null
  } catch {
    // Start block overrides are optional
    return null
  }
}

/**
 * Reads PDP configuration from the fwssView contract via an eth_call RPC request.
 * Returns maxProvingPeriod, challengeWindowSize, challengesPerProof, initChallengeWindowStart.
 */
async function fetchPDPConfig(network: string): Promise<PDPConfig> {
  const rpcUrl = RPC_URLS[network]
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for network '${network}'`)
  }

  const contracts = getChainContracts(network)
  const fwssViewAddress = contracts?.fwssView?.address
  if (!fwssViewAddress) {
    throw new Error(`No fwssView contract found for network '${network}' in @filoz/synapse-core`)
  }

  // getPDPConfig() selector: 0xea0f9354
  const calldata = '0xea0f9354'

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: fwssViewAddress, data: calldata }, 'latest'],
      id: 1,
    }),
  })

  const json = (await response.json()) as { result?: string; error?: { message: string } }
  if (json.error) {
    throw new Error(`RPC error calling getPDPConfig: ${json.error.message}`)
  }
  if (!json.result || json.result === '0x') {
    throw new Error(`Empty response from getPDPConfig on ${network}`)
  }

  // Decode ABI-encoded response: 4 × 32-byte words
  // (uint64 maxProvingPeriod, uint256 challengeWindowSize, uint256 challengesPerProof, uint256 initChallengeWindowStart)
  const hex = json.result.slice(2) // remove '0x'
  if (hex.length < 256) {
    throw new Error(`Unexpected response length from getPDPConfig: ${hex.length} hex chars`)
  }

  const maxProvingPeriod = parseInt(hex.slice(0, 64), 16)
  const challengeWindowSize = parseInt(hex.slice(64, 128), 16)
  const challengesPerProof = parseInt(hex.slice(128, 192), 16)
  const initChallengeWindowStart = parseInt(hex.slice(192, 256), 16)

  return { maxProvingPeriod, challengeWindowSize, challengesPerProof, initChallengeWindowStart }
}

/**
 * Loads and validates network configuration from @filoz/synapse-core
 * @param network - The network name to load ("mainnet" or "calibration")
 * @returns The network configuration object formatted for templates
 */
export async function loadNetworkConfig(network = 'calibration'): Promise<NetworkConfig> {
  if (network !== 'mainnet' && network !== 'calibration') {
    console.error(`Error: Unknown network '${network}'`)
    console.error(`Available networks: mainnet, calibration`)
    process.exit(1)
  }

  console.log(`Loading contract addresses from @filoz/synapse-core for ${network}...`)

  const contracts = getChainContracts(network)
  if (!contracts) {
    console.error(`Error: No contracts found for network '${network}' in @filoz/synapse-core`)
    process.exit(1)
  }

  // Load start block overrides (optional)
  const startBlockOverrides = loadStartBlockOverrides(network)
  const defaultStartBlocks = DEFAULT_START_BLOCKS[network] || {}

  // Build the configuration object expected by templates
  const config: NetworkConfig = {
    name: NETWORK_NAMES[network],
  }

  // Map synapse-core contract addresses to template format
  for (const [contractKey, templateKey] of Object.entries(CONTRACT_MAPPING)) {
    const contract = contracts[contractKey]

    if (!contract || !contract.address) {
      console.error(`Error: Missing '${contractKey}' contract or address in @filoz/synapse-core for ${network}`)
      process.exit(1)
    }

    // Get start block from overrides, defaults, or fallback
    const startBlock = startBlockOverrides?.[templateKey] || defaultStartBlocks[templateKey] || 0

    config[templateKey] = {
      address: contract.address,
      startBlock: startBlock,
    }

    // Save ABI to abi/ directory for Graph CLI
    saveAbi(templateKey, contract.abi)
  }

  // Read PDP configuration from fwssView contract
  try {
    const pdpConfig = await fetchPDPConfig(network)
    config.pdpConfig = pdpConfig
    console.log(`✅ Read PDP config from fwssView: challengesPerProof=${pdpConfig.challengesPerProof}, maxProvingPeriod=${pdpConfig.maxProvingPeriod}, challengeWindowSize=${pdpConfig.challengeWindowSize}`)
  } catch (error) {
    console.error(`Error: Failed to read PDP config from fwssView contract`)
    console.error(`${(error as Error).message}`)
    process.exit(1)
  }

  console.log(`✅ Loaded contract addresses from @filoz/synapse-core`)
  return config
}

/**
 * Saves an ABI from @filoz/synapse-core to the abi/ directory
 * @param contractName - The contract name (e.g., "PDPVerifier")
 * @param abi - The ABI array from synapse-core
 */
function saveAbi(contractName: string, abi: unknown[]): void {
  const abiDir = join(__dirname, '..', '..', 'abi')
  const abiPath = join(abiDir, `${contractName}.abi.json`)

  try {
    // Create abi directory if it doesn't exist
    mkdirSync(abiDir, { recursive: true })

    // Write ABI file
    writeFileSync(abiPath, JSON.stringify(abi, null, 2))
  } catch (error) {
    console.warn(`Warning: Failed to save ABI for ${contractName}: ${(error as Error).message}`)
    console.warn(`The Graph CLI will attempt to use existing ABI file at: ${abiPath}`)
  }
}

/**
 * Gets the path to an ABI file
 * @param contractName - The contract name (e.g., "PDPVerifier")
 * @returns The absolute path to the ABI file
 */
export function getAbiPath(contractName: string): string {
  return join(__dirname, '..', '..', 'abi', `${contractName}.abi.json`)
}

/**
 * Loads an ABI from abi/ directory
 * @param contractName - The contract name (e.g., "PDPVerifier")
 * @returns The parsed ABI array
 */
export function loadAbi(contractName: string): unknown[] {
  const abiPath = getAbiPath(contractName)

  try {
    const content = readFileSync(abiPath, 'utf8')
    return JSON.parse(content) as unknown[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Error: ABI file not found at: ${abiPath}`)
      console.error(`Please ensure abi/${contractName}.abi.json exists.`)
      process.exit(1)
    }
    if (error instanceof SyntaxError) {
      console.error(`Error: Invalid JSON in ABI file: ${abiPath}`)
      console.error(`JSON Error: ${error.message}`)
    } else {
      console.error(`Error reading ABI file: ${abiPath}`)
      console.error(`File Error: ${(error as Error).message}`)
    }
    process.exit(1)
  }
}
