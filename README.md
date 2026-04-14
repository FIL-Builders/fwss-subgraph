# Filecoin Services Subgraph - Multi-Network Deployment

This guide details the steps required to deploy the subgraph to multiple Filecoin networks (testnet and mainnet) using generated configuration and ABI files.

## Prerequisites

Before you begin, ensure you have the following installed and set up:

1.  **Node.js and Corepack:** The subgraph tooling requires Node.js 20.18.1 or newer. Download it from [nodejs.org](https://nodejs.org/) and enable Corepack so the pinned `pnpm` version is available:
    ```bash
    corepack enable
    ```
2.  **Dependencies:** Install the project dependencies from the repo root:
    ```bash
    corepack pnpm install
    ```
3.  **Goldsky Account:** You need an account on Goldsky to host your subgraph. Sign up at [goldsky.com](https://goldsky.com/).
4.  **Goldsky CLI:** This tool allows you to deploy subgraphs to the Goldsky platform. Follow the installation instructions in the [Goldsky Documentation](https://docs.goldsky.com/introduction).

## Multi-Network Configuration

This subgraph supports deployment to multiple Filecoin networks. The configuration is managed through:

- **`@filoz/synapse-core/chains`**: Source of truth for contract addresses and current ABIs
- **`config/start-blocks.json`**: Optional local overrides for per-network start blocks
- **`templates/subgraph.template.yaml`**: Template file for the generated `subgraph.yaml`
- **`templates/constants.template.ts`**: Template file for generated TypeScript constants
- **`scripts/generate-config.ts`**: Generates `subgraph.yaml` or prints the resolved config JSON
- **`scripts/generate-constants.ts`**: Generates `src/generated/constants.ts`
- **`abi/*.abi.json`**: Generated ABI files written at build time (`FilecoinWarmStorageServiceLegacy` remains committed)

### Available Networks

- **Calibration**: Calibration network configuration sourced from `@filoz/synapse-core`
- **Mainnet**: Mainnet network configuration sourced from `@filoz/synapse-core`

### Quick Start Commands

For **Calibration**:

```bash
# Build for calibration
corepack pnpm run build:calibration

# Deploy to calibration
goldsky subgraph deploy <your-subgraph-name>/<version>
```

For **Mainnet**:

```bash
# Build for mainnet
corepack pnpm run build:mainnet

# Deploy to mainnet
goldsky subgraph deploy <your-subgraph-name>/<version>
```

### Available Scripts

The following scripts are available for multi-network deployment:

**Network-specific builds:**

- `corepack pnpm run build:calibration` - Build for calibration network
- `corepack pnpm run build:mainnet` - Build for mainnet

**Template generation:**

- `corepack pnpm run generate:yaml:calibration` - Generate `subgraph.yaml` for calibration
- `corepack pnpm run generate:yaml:mainnet` - Generate `subgraph.yaml` for mainnet

**Constants generation:**

- `corepack pnpm run generate:constants:calibration` - Generate contract addresses for calibration
- `corepack pnpm run generate:constants:mainnet` - Generate contract addresses for mainnet

**Environment variable approach:**

```bash
# Set network via environment variable (defaults to calibration)
NETWORK=mainnet corepack pnpm run precodegen
```

**Inspect resolved config without writing files:**

```bash
corepack pnpm exec tsx ./scripts/generate-config.ts calibration
```

## Automated Contract Address Generation

One of the key features of this setup is **automated contract address generation**. Instead of manually updating hardcoded addresses in your TypeScript files, the system automatically generates them from the published `@filoz/synapse-core` package.

### How It Works

1. **Configuration Source**: Contract addresses and ABIs are loaded from `@filoz/synapse-core/chains`
2. **Template Files**: Mustache templates in `templates/` define structure for generated files
3. **Generation Scripts**:
   - `scripts/generate-config.ts` resolves network config and optionally generates `subgraph.yaml`
   - `scripts/generate-constants.ts` uses `templates/constants.template.ts` to generate TypeScript constants
4. **Generated Files**: Creates `src/generated/constants.ts`, `subgraph.yaml`, and ABI files under `abi/`
5. **Import**: Your code imports from the generated file via `src/utils/constants.ts`

If you need to override start blocks locally, create `config/start-blocks.json` with per-network values:

```json
{
  "calibration": {
    "PDPVerifier": 2988297,
    "ServiceProviderRegistry": 2988311,
    "FilecoinWarmStorageService": 2988329,
    "USDFCToken": 2988000
  }
}
```

### Generated Constants Structure

The generated `src/generated/constants.ts` includes:

```typescript
export class ContractAddresses {
  static readonly PDPVerifier: Address = Address.fromBytes(/*...*/);
  static readonly ServiceProviderRegistry: Address = Address.fromBytes(/*...*/);
  static readonly FilecoinWarmStorageService: Address = Address.fromBytes(/*...*/);
  static readonly USDFCToken: Address = Address.fromBytes(/*...*/);
}
```

### Usage in Code

```typescript
import { ContractAddresses } from "./constants";

// Use network-specific addresses
const pdpContract = PDPVerifier.bind(ContractAddresses.PDPVerifier);
```

## Deploying the Subgraph

Follow these steps to build and deploy the subgraph:

1.  **Navigate to Subgraph Directory:**
    Open your terminal and change to the `subgraph` directory within the project:

    ```bash
    cd path/to/pdp-explorer/subgraph
    ```

2.  **Install Dependencies:**
    Install the necessary node modules:

    ```bash
    corepack pnpm install
    ```

3.  **Authenticate with Goldsky:**
    Log in to your Goldsky account using the CLI. Go to settings section of your Goldsky dashboard to get your API key.

    ```bash
    goldsky login
    ```

4.  **Build the Subgraph:**
    Compile your subgraph code into WebAssembly (WASM) for the selected network (calibration or mainnet).

    ```bash
    corepack pnpm run build:calibration
    # or
    corepack pnpm run build:mainnet
    ```

5.  **Deploy to Goldsky:**
    Use the Goldsky CLI to deploy your built subgraph.

    ```bash
    goldsky subgraph deploy <your-subgraph-name>/<version> --path ./
    ```

    - Replace `<your-subgraph-name>` with the desired name for your subgraph deployment on Goldsky (e.g., `fwss-subgraph`). You can create/manage this name in your Goldsky dashboard.
    - Replace `<version>` with a version identifier (e.g., `v0.0.1`).
    - You can manage your deployments and find your subgraph details in the [Goldsky Dashboard](https://app.goldsky.com/). The deployment command will output the GraphQL endpoint URL for your subgraph upon successful completion. **Copy this URL**, as you will need it for the client.

6.  **Tag the Subgraph (Optional):**
    Tag the subgraph you deployed in step 5.

    ```bash
    goldsky subgraph tag create <your-subgraph-name>/<version> --tag <tag-name>
    ```

    - Replace `<tag-name>` with a tag name (e.g., `mainnet`).

    Remove the tag when you want to deploy a new version of the subgraph.

    ```bash
    goldsky subgraph tag delete <your-subgraph-name>/<version> --tag <tag-name>
    ```

## Modifying and Redeploying the Subgraph

If you need to make changes to the subgraph's logic, schema, or configuration, follow these general steps:

1.  **Modify Code:** Edit the relevant files:

    - `config/start-blocks.json`: To override generated start blocks locally.
    - `schemas/schema.*.graphql`: To change the data structure and entities being stored.
    - `templates/subgraph.template.yaml`: To update generated data sources, ABI references, or event handlers.
    - `src/*.ts`: To alter the logic that processes blockchain events and maps them to the defined schema entities.
    - `src/utils/*.ts`: If modifying shared utility functions or constants.

2.  **Rebuild:** Compile the updated subgraph code using `corepack pnpm run build:<network>`:

    ```bash
    corepack pnpm run build:calibration
    # or
    corepack pnpm run build:mainnet
    ```

3.  **Redeploy:** Deploy the new version to Goldsky. It's good practice to increment the version number:
    ```bash
    goldsky subgraph deploy <your-subgraph-name>/<new-version> --path ./
    ```
    Replace `<new-version>` (e.g., `v0.0.2`).

**Development Resources:**

- **AssemblyScript:** Subgraph mappings are written in AssemblyScript, a subset of TypeScript that compiles to Wasm. Learn more at [https://www.assemblyscript.org/](https://www.assemblyscript.org/).
- **The Graph Documentation:** The official documentation covers subgraph development in detail: [https://thegraph.com/docs/en/subgraphs/developing/creating/starting-your-subgraph/](https://thegraph.com/docs/en/subgraphs/developing/creating/starting-your-subgraph/).

## Further Information

- **Warm Storage Subgraph Api Documentation** [graphql](./API.md)
- **Graph Protocol Documentation:** [https://thegraph.com/docs/en/](https://thegraph.com/docs/en/)
- **Goldsky Documentation:** [https://docs.goldsky.com/](https://docs.goldsky.com/)
