# Sync Visibility

This document describes how to observe the indexer’s sync progress (last synced block) and how the dao-frontend sync-check notifies when the indexer falls behind.

## Reading “last synced block”

### Envio Logs

The **SyncProgressLogger** block handler runs every 500 blocks (configurable in `src/SyncProgressHandler.ts`) and logs the current block number:

- In the Envio hosted dashboard: open your indexer → **Logs** tab. Look for lines like:
  - `SyncProgressLogger: chain 31 last synced block 5784528`
- The block number in that line is the last block the indexer has processed for chain 31 (Rootstock Testnet).

### GraphQL

The indexer exposes a **SyncProgress** entity that is updated by the same block handler. You can query it via the Envio GraphQL endpoint:

```graphql
query GetSyncProgress {
  SyncProgress(where: { id: { _eq: "chain-31" } }, limit: 1) {
    id
    lastBlock
    chainId
  }
}
```

- **lastBlock** is the last synced block for Rootstock Testnet (chain 31).
- If no row exists yet (e.g. indexer just started), the block handler will populate it on its next run (every 500 blocks).

Fallback: if SyncProgress is not yet populated, you can approximate “last indexed block” by querying the latest proposal’s `createdAtBlock` (max over `Proposal.createdAtBlock`). That reflects the latest block that contained a Governor event, not necessarily the chain tip.

## Recommended acceptable lag (Rootstock Testnet)

- **Block time:** ~30 seconds on Rootstock Testnet.
- **Reasonable lag:** A few hundred blocks (e.g. 300–500 blocks ≈ 2.5–4 hours) can be acceptable during normal operation, especially right after restarts or during historical backfill.
- **Concerning lag:** If the indexer is consistently more than **500 blocks** behind the chain tip (or ~4+ hours), it may indicate RPC rate limiting, errors, or a stalled sync. The dao-frontend sync-check uses a default threshold of **500 blocks**; you can tune it with `ENVIO_SYNC_CHECK_LAG_THRESHOLD_BLOCKS`.

## Next.js sync-check (dao-frontend)

The dao-frontend app exposes an API route that compares the indexer’s last synced block to the Rootstock Testnet chain tip and can post a Slack alert when the indexer is behind.

- **Endpoint:** `GET /api/envio-sync-check`
- **Invocation:** Call this URL on a schedule (e.g. every 5–10 minutes) from a cron job, Vercel Cron, or another scheduler. The route does not run on an in-process interval; it runs once per HTTP request.

### Environment variables (dao-frontend)

| Variable | Required | Description |
|----------|----------|-------------|
| `ENVIO_GRAPHQL_URL` | Yes | Envio GraphQL endpoint (e.g. from `.env.release-candidate-testnet`). |
| `ENVIO_SYNC_CHECK_RPC_URL` | Yes | Rootstock Testnet RPC URL used to fetch chain tip (e.g. `https://rpc.testnet.rootstock.io/<API_KEY>`). |
| `ENVIO_SYNC_CHECK_SYNC_PROGRESS_ID` | No | SyncProgress entity id to query (default: `chain-31`). |
| `ENVIO_SYNC_CHECK_SLACK_WEBHOOK_URL` | No | Slack Incoming Webhook URL. If set, the route posts a message when lag exceeds the threshold. |
| `ENVIO_SYNC_CHECK_LAG_THRESHOLD_BLOCKS` | No | Lag (chain tip − last block) above this value triggers the Slack alert. Default: 500. |
| `ENVIO_SYNC_CHECK_SECRET` | No | If set, the request must include `Authorization: Bearer <value>`; otherwise the route returns 401. Use this in production so only your scheduler can trigger the check. |

### Example

- Scheduler runs every 5 minutes: `GET https://your-frontend.example.com/api/envio-sync-check` with header `Authorization: Bearer <ENVIO_SYNC_CHECK_SECRET>`.
- If the indexer’s last block is more than 500 blocks behind the chain tip, the route POSTs to the Slack webhook with a short message (last block, chain tip, lag, threshold).

This gives visibility into sync stalls (e.g. after hitting RPC limits) without requiring a paid Envio plan or third-party changes.
