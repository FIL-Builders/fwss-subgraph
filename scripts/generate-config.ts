#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mustache from 'mustache'
import { loadNetworkConfig } from './utils/config-loader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse command line arguments
const args = process.argv.slice(2)
const shouldGenerateYaml = args.includes('--yaml')

// Get network from command line arguments (excluding flags) or environment variable
const networkArgs = args.filter((arg) => !arg.startsWith('--'))
const network = process.env.NETWORK || networkArgs[0] || 'calibration'

const selectedConfig = await loadNetworkConfig(network)

if (shouldGenerateYaml) {
  const templatePath = join(__dirname, '..', 'templates', 'subgraph.reliability.template.yaml')
  let templateContent: string

  try {
    templateContent = readFileSync(templatePath, 'utf8')
  } catch (error) {
    console.error(`Error: Failed to read subgraph template at: ${templatePath}`)
    console.error(`Template Error: ${(error as Error).message}`)
    process.exit(1)
  }

  const yamlContent = mustache.render(templateContent, selectedConfig)

  const outputPath = join(__dirname, '..', 'subgraph.yaml')

  try {
    writeFileSync(outputPath, yamlContent)
    console.log(`✅ Generated subgraph.yaml for ${network} network at: ${outputPath}`)
    console.log(`   Source: @filoz/synapse-core package`)
  } catch (error) {
    console.error(`Error: Failed to write subgraph.yaml to: ${outputPath}`)
    console.error(`Write Error: ${(error as Error).message}`)
    process.exit(1)
  }
} else {
  console.log(JSON.stringify(selectedConfig, null, 2))
}
