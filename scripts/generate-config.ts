#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mustache from 'mustache'
import { loadNetworkConfig } from './utils/config-loader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const shouldGenerateYaml = args.includes('--yaml')

const networkArgs = args.filter((arg) => !arg.startsWith('--'))
const network = process.env.NETWORK || networkArgs[0] || 'calibration'

const selectedConfig = loadNetworkConfig(network)

if (shouldGenerateYaml) {
  const templatePath = join(__dirname, '..', 'templates', 'subgraph.template.yaml')
  let templateContent: string

  try {
    templateContent = readFileSync(templatePath, 'utf8')
  } catch (error) {
    console.error(`Error: Failed to read subgraph template at: ${templatePath}`)
    process.exit(1)
  }

  const yamlContent = mustache.render(templateContent, selectedConfig)
  const outputPath = join(__dirname, '..', 'subgraph.yaml')

  try {
    writeFileSync(outputPath, yamlContent)
    console.log(`✅ Generated subgraph.yaml for ${network} network at: ${outputPath}`)
  } catch (error) {
    console.error(`Error: Failed to write subgraph.yaml to: ${outputPath}`)
    process.exit(1)
  }
} else {
  console.log(JSON.stringify(selectedConfig, null, 2))
}
