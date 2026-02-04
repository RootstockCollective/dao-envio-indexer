# DAO Envio Indexer

Envio indexer for DAO ecosystem data. Indexes on-chain events and exposes them via GraphQL API.

## Overview

Envio-based indexer for the DAO ecosystem. Currently indexes governance data from the Governor contract, with architecture designed to support additional data sources (staking, vault history, rewards, etc.) through configuration.

### Currently Indexed Events (Governor)

- `ProposalCreated` - Creates proposal entity with quorum fetched via RPC
- `VoteCast` / `VoteCastWithParams` - Aggregates vote counts, stores individual votes
- `ProposalCanceled` / `ProposalExecuted` / `ProposalQueued` - Updates terminal state flags

## Prerequisites

- Node.js >= 22.0.0
- pnpm >= 9.15.0
- Docker (for local development)

## Setup

1. **Install dependencies:**

```bash
pnpm install
```

2. **Configure environment:**

```bash
cp .env.example .env.dev
# Edit .env.dev with your values
```

3. **Generate types:**

```bash
source .env.dev && pnpm codegen
```

4. **Run locally:**

```bash
source .env.dev && pnpm dev
```

## Environment Configuration

| Variable                 | Description                     | Example                                      |
| ------------------------ | ------------------------------- | -------------------------------------------- |
| `ENVIO_CHAIN_ID`         | Chain ID                        | `31` (Rootstock Testnet)                     |
| `ENVIO_START_BLOCK`      | Block to start indexing from    | `5784028`                                    |
| `ENVIO_GOVERNOR_ADDRESS` | Governor contract address       | `0xB1A39B8f57A55d1429324EEb1564122806eb297F` |
| `ENVIO_RPC_URL`          | RPC endpoint for contract reads | `https://public-node.testnet.rsk.co`         |

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
ENVIO_RPC_URL=https://public-node.rsk.co
```

3. Run with new environment:

```bash
source .env.mainnet && pnpm dev
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

## License

MIT
