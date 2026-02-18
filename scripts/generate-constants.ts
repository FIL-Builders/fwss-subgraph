#!/usr/bin/env tsx

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mustache from 'mustache'
import { loadNetworkConfig } from './utils/config-loader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse command line arguments
const args = process.argv.slice(2)

// Get network from command line arguments (excluding flags) or environment variable
const networkArgs = args.filter((arg) => !arg.startsWith('--'))
const network = process.env.NETWORK || networkArgs[0] || 'calibration'

const selectedConfig = await loadNetworkConfig(network)

const requiredContracts = ['PDPVerifier', 'ServiceProviderRegistry', 'FilecoinWarmStorageService', 'USDFCToken']
for (const contract of requiredContracts) {
  const contractConfig = selectedConfig[contract]
  if (!contractConfig || typeof contractConfig === 'string' || !contractConfig.address) {
    console.error(`Error: Missing or invalid '${contract}' configuration for network '${network}'`)
    console.error(`Contract must have an 'address' field in deployments.json`)
    process.exit(1)
  }
}

const templatePath = join(__dirname, '..', 'templates', 'constants.template.ts')
let templateContent: string

try {
  templateContent = readFileSync(templatePath, 'utf8')
} catch (error) {
  console.error(`Error: Failed to read constants template at: ${templatePath}`)
  console.error(`Template Error: ${(error as Error).message}`)
  process.exit(1)
}

const templateData = {
  network: network,
  timestamp: new Date().toISOString(),
  ...selectedConfig,
}

const constantsContent = mustache.render(templateContent, templateData)

const generatedDir = join(__dirname, '..', 'src', 'generated')
const outputPath = join(generatedDir, 'constants.ts')

try {
  mkdirSync(generatedDir, { recursive: true })

  writeFileSync(outputPath, constantsContent)
  console.log(`✅ Generated constants for ${network} network at: ${outputPath}`)
  console.log(`   Source: @filoz/synapse-core package`)
} catch (error) {
  console.error(`Error: Failed to write constants file to: ${outputPath}`)
  console.error(`Write Error: ${(error as Error).message}`)
  console.error('Please check directory permissions and available disk space.')
  process.exit(1)
}
