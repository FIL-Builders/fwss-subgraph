#!/usr/bin/env tsx

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mustache from 'mustache'
import { loadNetworkConfig } from './utils/config-loader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const networkArgs = args.filter((arg) => !arg.startsWith('--'))
const network = process.env.NETWORK || networkArgs[0] || 'calibration'

const selectedConfig = loadNetworkConfig(network)

const requiredContracts = ['PDPVerifier', 'ServiceProviderRegistry', 'FilecoinWarmStorageService', 'USDFCToken']
for (const contract of requiredContracts) {
  const contractConfig = selectedConfig[contract]
  if (!contractConfig || typeof contractConfig === 'string' || !(contractConfig as any).address) {
    console.error(`Error: Missing or invalid '${contract}' configuration for network '${network}'`)
    process.exit(1)
  }
}

const templatePath = join(__dirname, '..', 'templates', 'constants.template.ts')
let templateContent: string

try {
  templateContent = readFileSync(templatePath, 'utf8')
} catch (error) {
  console.error(`Error: Failed to read constants template at: ${templatePath}`)
  process.exit(1)
}

const templateData = {
  network,
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
} catch (error) {
  console.error(`Error: Failed to write constants file to: ${outputPath}`)
  process.exit(1)
}
