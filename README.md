# DAO Envio Indexer

Envio indexer for DAO ecosystem data. Indexes on-chain events and exposes them via GraphQL API.

## Quick Start (TL;DR)

```bash
# 1. Get a free RPC API key from https://rpc.rootstock.io/

# 2. Setup
pnpm install
cp .env.example .env.dev

# 3. Edit .env.dev - update ENVIO_RPC_URL with your API key:
#    ENVIO_RPC_URL=https://rpc.testnet.rootstock.io/<YOUR_API_KEY>

# 4. Run (Docker must be running)
export $(grep -v '^#' .env.dev | xargs) && pnpm dev

# 5. Open GraphQL Playground: http://localhost:8080
#    Password: testing
```

## Overview

Envio-based indexer for the DAO ecosystem. Currently indexes governance data from the Governor contract, with architecture designed to support additional data sources (staking, vault history, rewards, etc.) through configuration.

### Currently Indexed Events (Governor)

- `ProposalCreated` - Creates proposal entity with quorum fetched via RPC
- `VoteCast` / `VoteCastWithParams` - Aggregates vote counts, stores individual votes
- `ProposalCanceled` / `ProposalExecuted` / `ProposalQueued` - Updates terminal state flags

## Prerequisites

- Node.js >= 22.0.0
- pnpm >= 9.15.0
- Docker Desktop (must be running)
- **Rootstock RPC API Key** (free) - get one at https://rpc.rootstock.io/
  - Required because the public node (`public-node.testnet.rsk.co`) doesn't support `eth_getLogs`

## Setup

1. **Install dependencies:**

```bash
pnpm install
```

2. **Configure environment:**

```bash
cp .env.example .env.dev
```

3. **Get RPC API Key** (required):
   - Go to https://rpc.rootstock.io/
   - Sign up / Log in with GitHub
   - Create API key for **Testnet**
   - Update `.env.dev`:
     ```
     ENVIO_RPC_URL=https://rpc.testnet.rootstock.io/<YOUR_API_KEY>
     ```

4. **Run locally** (Docker must be running):

```bash
export $(grep -v '^#' .env.dev | xargs) && pnpm dev
```

5. **Access GraphQL Playground**: http://localhost:8080
   - Admin password: `testing`

> **Note:** The `export $(grep ...)` pattern filters out comments and exports variables to the shell.

## Environment Configuration

| Variable                 | Description                    | Example                                           |
| ------------------------ | ------------------------------ | ------------------------------------------------- |
| `ENVIO_CHAIN_ID`         | Chain ID                       | `31` (Rootstock Testnet)                          |
| `ENVIO_START_BLOCK`      | Block to start indexing from   | `7290000` (recent) or `5784028` (all history)     |
| `ENVIO_GOVERNOR_ADDRESS` | Governor contract address      | `0xB1A39B8f57A55d1429324EEb1564122806eb297F`      |
| `ENVIO_RPC_URL`          | RPC endpoint (with API key)    | `https://rpc.testnet.rootstock.io/<YOUR_API_KEY>` |
| `ENVIO_API_TOKEN`        | HyperSync API token (optional) | `your-api-token`                                  |

> **Tip:** Use a recent `ENVIO_START_BLOCK` (e.g., last week) for fast initial sync during development. Use the contract deployment block for production.

## Data Source: RPC vs HyperSync

The indexer supports two data sources:

- **RPC Mode** (default): Uses standard RPC endpoint. Works on all chains but slower sync.
- **HyperSync Mode**: Uses Envio's HyperSync for up to 2000x faster syncing.

### Current Status

| Chain             | Chain ID | HyperSync Support |
| ----------------- | -------- | ----------------- |
| Rootstock Mainnet | 30       | Yes               |
| Rootstock Testnet | 31       | Pending           |

### Switching to HyperSync

When HyperSync becomes available for your chain:

1. **Get an API token** at https://envio.dev/app/api-tokens

2. **Add token to your `.env` file:**

```bash
ENVIO_API_TOKEN=your-api-token-here
```

3. **Update `config.yaml`** - comment out `rpc_config` and uncomment `hypersync_config`:

```yaml
networks:
  - id: ${ENVIO_CHAIN_ID}
    start_block: ${ENVIO_START_BLOCK}
    # HyperSync (uncomment when available)
    hypersync_config:
      url: https://${ENVIO_CHAIN_ID}.hypersync.xyz
      bearer_token: ${ENVIO_API_TOKEN}
    # RPC fallback (comment out when using HyperSync)
    # rpc_config:
    #   url: ${ENVIO_RPC_URL}
```

4. **Restart the indexer:**

```bash
pnpm envio stop
export $(grep -v '^#' .env.dev | xargs) && pnpm dev
```

## Adding a New Environment

1. Create environment file:

```bash
cp .env.example .env.mainnet
```

2. Update values:

```bash
ENVIO_CHAIN_ID=30
ENVIO_START_BLOCK=<deployment_block>
ENVIO_GOVERNOR_ADDRESS=<mainnet_governor_address>
# For mainnet, HyperSync is available - no RPC needed
# Or use: ENVIO_RPC_URL=https://rpc.mainnet.rootstock.io/<YOUR_API_KEY>
```

3. Run with new environment:

```bash
export $(grep -v '^#' .env.mainnet | xargs) && pnpm dev
```

## GraphQL API

Once running, access the GraphQL playground at `http://localhost:8080`.

### Example Query

```graphql
query GetProposals {
  Proposal(order_by: { createdAt: desc }, limit: 10) {
    id
    proposalId
    proposer
    description
    voteStart
    voteEnd
    votesFor
    votesAgainst
    votesAbstains
    quorum
    isCanceled
    isExecuted
    isQueued
    createdAtBlock
  }
}
```

### Example Response

```json
{
  "data": {
    "Proposal": [
      {
        "id": "12345",
        "proposalId": "12345",
        "proposer": "0x1234...5678",
        "description": "# Proposal Title\n\nDescription here...",
        "voteStart": "7000000",
        "voteEnd": "7100000",
        "votesFor": "1000000000000000000000",
        "votesAgainst": "500000000000000000000",
        "votesAbstains": "100000000000000000000",
        "quorum": "4000000000000000000000",
        "isCanceled": false,
        "isExecuted": false,
        "isQueued": false,
        "createdAtBlock": "6900000"
      }
    ]
  }
}
```

## Deployment

### Envio Hosted Service

1. Install Envio CLI globally:

```bash
npm install -g envio
```

2. Login to Envio:

```bash
envio login
```

3. Deploy:

```bash
source .env.dev && envio deploy
```

## Extending the Indexer

### Adding New Events

1. Update `config.yaml` with new event signatures
2. Run `pnpm codegen` to regenerate types
3. Add handler in `src/EventHandlers.ts`

### Adding New Contracts (e.g., Staking, Vault)

1. Add ABI to `abis/` folder
2. Add contract definition to `config.yaml`:

```yaml
contracts:
  - name: Governor
    # existing config...

  - name: Staking
    abi_file_path: ./abis/Staking.json
    handler: src/StakingHandlers.ts
    events:
      - event: 'Staked(address indexed user, uint256 amount)'
      - event: 'Unstaked(address indexed user, uint256 amount)'
```

3. Add network binding:

```yaml
networks:
  - id: ${ENVIO_CHAIN_ID}
    contracts:
      - name: Governor
        address: ${ENVIO_GOVERNOR_ADDRESS}
      - name: Staking
        address: ${ENVIO_STAKING_ADDRESS}
```

4. Create schema entities in `schema.graphql`
5. Run `pnpm codegen`
6. Implement handlers in new handler file

## Project Structure

```
dao-envio-indexer/
├── abis/                    # Contract ABIs
│   └── Governor.json
├── src/
│   ├── EventHandlers.ts     # Event handler implementations
│   └── effects/
│       └── quorumEffect.ts  # Effect API for RPC calls
├── generated/               # Auto-generated (do not edit)
├── config.yaml              # Envio configuration
├── schema.graphql           # GraphQL schema
├── .env.dev                 # DEV environment config
├── .env.example             # Environment template
├── package.json
└── tsconfig.json
```

## Troubleshooting

### Sync is very slow

- Use a recent `ENVIO_START_BLOCK` for faster testing
- When HyperSync becomes available for Rootstock Testnet, switch to it (2000x faster)

### No proposals showing

Check your `ENVIO_START_BLOCK` - proposals created before that block won't be indexed. Lower it to include more history.

### Testing with Frontend

1. Keep indexer running (`pnpm dev`)
2. In `dao-frontend/.env.dev`, ensure: `ENVIO_GRAPHQL_URL=http://localhost:8080/v1/graphql`
3. Run frontend: `pnpm dev`
4. Check response header `X-Source: source-0` to confirm Envio is being used

## License

MIT
