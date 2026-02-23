# Deployment Architecture

## Why Branch-Per-Deployment

The Envio hosted service uses a **git-based deployment model**: each indexer watches a branch and redeploys on every push. On the **free (Development) plan**, environment variables are not available in the Envio dashboard, so every deployment-specific value must be hardcoded directly in `config.yaml`.

Because different frontend profiles (dev, release-candidate-testnet, mainnet) point at **different Governor contract addresses**, each one requires its own indexer instance with its own `config.yaml`. A single indexer cannot serve multiple Governor contracts without mixing unrelated governance data in the same GraphQL endpoint.

This leads to the current architecture: **one branch per deployment**, where each branch only diverges from `main` in its `config.yaml`.

```
main                  shared codebase (handlers, schema, ABIs, docs)
 ├── dev-index        config.yaml → dev Governor
 ├── rc-testnet       config.yaml → release-candidate-testnet Governor
 └── (future)         config.yaml → mainnet Governor, etc.
```

## Current Deployment Map

| Branch | Indexer Name | Governor Address | Chain | Start Block | Frontend Profile |
|---|---|---|---|---|---|
| `dev-index` | `dao-envio-indexer-dev` | `0xB1A39B8f57A55d1429324EEb1564122806eb297F` | 31 (testnet) | 5512037 | dev |
| `rc-testnet` | `dao-envio-indexer-rc-testnet` | `0xb77ab0075e9805efa82040bed73368d988a2d9c2` | 31 (testnet) | 5784028 | release-candidate-testnet |

## What Differs Per Branch

Each deployment branch changes **only** the following fields in `config.yaml`:

| Field | Why it differs |
|---|---|
| `name` | Envio dashboard identifier |
| `description` | Human-readable label |
| `networks[].start_block` | Earliest block with events for that Governor |
| `networks[].rpc_config.url` | Dedicated RPC API key (avoids shared rate limits) |
| `networks[].contracts[].address` | The Governor proxy address for that environment |

Everything else (event definitions, handler code, schema, ABIs, RPC tuning parameters) stays identical and is inherited from `main`.

## Adding a New Deployment

1. **Branch from main:**
   ```bash
   git checkout main && git pull
   git checkout -b <branch-name>
   ```

2. **Edit `config.yaml`** with environment-specific values:
   - `name`: unique indexer name (e.g. `dao-envio-indexer-staging`)
   - `start_block`: earliest block with Governor events (verify with Blockscout or The Graph)
   - `rpc_config.url`: a **dedicated** RPC API key (get one at https://rpc.rootstock.io/)
   - `contracts[].address`: the Governor proxy address for this environment

3. **Push the branch:**
   ```bash
   git add config.yaml && git commit -m "Configure for <environment>"
   git push origin <branch-name>
   ```

4. **Create an indexer in the Envio dashboard** (https://envio.dev/app):
   - Add Indexer → connect the repo → set the deployment branch to `<branch-name>`
   - Ensure the Envio GitHub App has access to the repo/org

5. **Verify** the deployment starts syncing in the Logs tab. First sync via RPC takes several hours for testnet.

## RPC Constraints (Rootstock Testnet)

### eth_getLogs block range limit

Rootstock's RPC nodes enforce a **maximum of 2,000 blocks per `eth_getLogs` request**. Requests exceeding this limit return an error that crashes the ethers.js parser inside Envio, causing block ranges to be silently skipped.

The `config.yaml` includes tuning parameters to stay within this limit:

```yaml
rpc_config:
  initial_block_interval: 1999
  interval_ceiling: 1999
```

**Do not remove these.** They are required for all Rootstock testnet deployments using RPC.

### API key daily quota

The free tier at `rpc.rootstock.io` allows **25,000 requests per day per key** (up to 4 keys per account). Each deployment should use a **separate API key** to avoid quota contention. A full historical sync from block ~5.5M needs roughly 800 requests and fits well within the daily limit.

### Public node limitations

The Rootstock public nodes (`public-node.testnet.rsk.co`, `mycrypto.testnet.rsk.co`) **do not support `eth_getLogs`** and cannot be used for indexing.

## Future: Migrating to Paid Plan

Once the project moves to the Envio **paid plan**, the hosted service supports **environment variables** in the dashboard (prefixed with `ENVIO_`). This eliminates the need for deployment branches entirely.

### Migration steps

1. **Update `config.yaml` on `main`** to use env var interpolation:
   ```yaml
   name: ${ENVIO_INDEXER_NAME:dao-envio-indexer}

   networks:
     - id: ${ENVIO_CHAIN_ID:31}
       start_block: ${ENVIO_START_BLOCK:5512037}
       rpc_config:
         url: ${ENVIO_RPC_URL}
         initial_block_interval: 1999
         interval_ceiling: 1999
         backoff_multiplicative: 0.8
         acceleration_additive: 100
         backoff_millis: 5000
         query_timeout_millis: 20000
       contracts:
         - name: Governor
           address: ${ENVIO_GOVERNOR_ADDRESS}
   ```

2. **Set environment variables** in each indexer's Settings → Environment Variables tab.

3. **Point all indexers at `main`** as the deployment branch.

4. **Delete the deployment branches** (`dev-index`, `rc-testnet`, etc.) -- they are no longer needed.

5. **Update this document** to reflect the new single-branch architecture.
