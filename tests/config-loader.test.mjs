import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const configDir = join(repoRoot, 'config')
const startBlocksPath = join(configDir, 'start-blocks.json')
const generatedAbiPaths = [
  join(repoRoot, 'abi', 'PDPVerifier.abi.json'),
  join(repoRoot, 'abi', 'FilecoinWarmStorageService.abi.json'),
  join(repoRoot, 'abi', 'ServiceProviderRegistry.abi.json'),
  join(repoRoot, 'abi', 'USDFCToken.abi.json'),
]
const subgraphPath = join(repoRoot, 'subgraph.yaml')
const generateConfigPath = join(repoRoot, 'scripts', 'generate-config.ts')

function runGenerateConfig(args = []) {
  return spawnSync(process.execPath, ['--import', 'tsx', generateConfigPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
}

function cleanupGeneratedFiles() {
  for (const abiPath of generatedAbiPaths) {
    if (existsSync(abiPath)) {
      unlinkSync(abiPath)
    }
  }

  if (existsSync(subgraphPath)) {
    unlinkSync(subgraphPath)
  }
}

let originalStartBlocks = null

test.beforeEach(() => {
  cleanupGeneratedFiles()
  mkdirSync(configDir, { recursive: true })
  originalStartBlocks = existsSync(startBlocksPath) ? readFileSync(startBlocksPath, 'utf8') : null
})

test.afterEach(() => {
  if (originalStartBlocks === null) {
    rmSync(startBlocksPath, { force: true })
  } else {
    writeFileSync(startBlocksPath, originalStartBlocks)
  }

  cleanupGeneratedFiles()
})

test('generate-config stdout stays machine-readable JSON', () => {
  const result = runGenerateConfig(['calibration'])

  assert.equal(result.status, 0, result.stderr)
  assert.doesNotThrow(() => JSON.parse(result.stdout))
  assert.match(result.stderr, /Loading contract addresses from @filoz\/synapse-core/)
})

test('generate-config fails on malformed start block overrides', () => {
  writeFileSync(startBlocksPath, '{bad json\n')

  const result = runGenerateConfig(['--yaml'])

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Failed to load start block overrides/)
})

test('generate-config preserves explicit zero start block overrides', () => {
  writeFileSync(
    startBlocksPath,
    JSON.stringify(
      {
        calibration: {
          PDPVerifier: 0,
        },
      },
      null,
      2,
    ),
  )

  const result = runGenerateConfig(['calibration'])

  assert.equal(result.status, 0, result.stderr)
  const parsed = JSON.parse(result.stdout)
  assert.equal(parsed.PDPVerifier.startBlock, 0)
})
