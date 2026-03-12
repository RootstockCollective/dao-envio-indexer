*RPC Usage Report — DAO Envio Indexer*

_Date:_ 2025-03-04
_Branch:_ `rc-testnet`
_Network:_ Rootstock Testnet (chain 31)
_RPC Provider:_ `rpc.testnet.rootstock.io`
_Current Tier:_ Free (25,000 requests/day) — *exceeded*

———————————————————

*1. Indexer Configuration*

• Contract: Governor (`0xb77ab0...9c2`)
• Events indexed: 6 (ProposalCreated, ProposalCanceled, ProposalExecuted, ProposalQueued, VoteCast, VoteCastWithParams)
• Start block: 5,784,028
• Block interval: 1,999 (Rootstock enforces 2,000-block limit on `eth_getLogs`)
• Data source: RPC only (no HyperSync)

———————————————————

*2. How the Indexer Uses RPC*

The Envio indexer in RPC-only mode makes four types of calls:

• `eth_getBlockNumber` — Poll chain tip to detect new blocks. Runs continuously (~every 1–2s).
• `eth_getLogs` — Fetch Governor events in ≤1,999-block batches. Runs per polling cycle when new blocks exist.
• `eth_getBlockByNumber` — Retrieve block metadata (timestamps, hashes). Runs per block containing events.
• `eth_call` — `Governor.quorum(uint256)` via effect handler. Once per ProposalCreated event (rare, cached).

———————————————————

*3. Daily Request Estimate*

Rootstock Testnet block time: ~30 seconds → *~2,880 blocks/day*

*Steady-state operation (indexer is caught up):*

• `eth_getBlockNumber` — *43,200 – 86,400 req/day* — Envio polls every 1–2s (86,400s / interval)
• `eth_getLogs` — *~2,880 req/day* — ~1 call per new block when at chain tip
• `eth_getBlockByNumber` — *~2,880 req/day* — Block metadata for each indexed block
• `eth_call` (quorum) — *< 10 req/day* — Only on ProposalCreated; cached and rate-limited
• *Total (steady state): ~50,000 – 90,000 req/day*

*Burst scenarios (restarts, redeployments, resyncs):*

When the indexer restarts or redeploys, it replays from its last checkpoint (or from `start_block` on a fresh deploy). This triggers rapid sequential `eth_getLogs` calls:

• Resync 10,000 blocks → *~5,000 extra requests*
• Resync 100,000 blocks → *~50,000 extra requests*
• Full resync from start → *~100,000+ extra requests*

A single redeployment can add 50,000–100,000+ requests on top of the daily steady-state load.

———————————————————

*4. Why 25,000/Day Is Not Enough*

:warning: The free tier limit of 25,000 requests/day is insufficient because:

1. *`eth_getBlockNumber` polling alone exceeds it.* At 1-second polling, the indexer makes 86,400 calls/day — 3.4× the limit.
2. *Event fetching adds ~2,880 more calls/day* on top of polling.
3. *Any restart or redeployment causes a burst* of thousands of additional calls.
4. *The limit leaves zero headroom* for debugging, monitoring, or operational events.

———————————————————

*5. Recommended Daily Limit*

• Single testnet indexer (steady state): *100,000/day*
• With headroom for 1–2 restarts/day: *200,000/day*
• With headroom for full resyncs + debugging: *500,000/day*

:point_right: *Recommendation:* Request *200,000 requests/day* minimum for the testnet indexer. If frequent redeployments or full resyncs are expected during testing, request *500,000/day*.

———————————————————

*6. Current Optimizations Already in Place*

The codebase already implements several RPC optimizations:

• *Effect caching* (`quorumEffect.ts` — `cache: true`) — Deduplicates identical `quorum()` reads
• *Rate limiting* (`quorumEffect.ts` — `rateLimit: calls 10/second`) — Prevents `eth_call` bursts
• *Batch transport* (`quorumEffect.ts` — `batch: true`) — Batches multiple `eth_call` into one HTTP request
• *Block interval cap* (`config.yaml` — `interval_ceiling: 1999`) — Stays within Rootstock's `eth_getLogs` limit
• *Public node fallback* (`quorumEffect.ts` — fallback to `public-node.testnet.rsk.co`) — Quorum reads don't consume the rate-limited key

———————————————————

*7. Further Optimization Opportunities*

*7.1 Separate RPC keys for polling vs. quorum reads*
The indexer's event fetching (polling + `eth_getLogs`) and the quorum `eth_call` use different RPC endpoints. Ensure `ENVIO_RPC_URL` is set to the public node or a separate key so that quorum reads never consume the primary key's quota.

*7.2 HyperSync (future)*
When Envio adds HyperSync support for Rootstock Testnet (chain 31), switching to HyperSync would eliminate `eth_getBlockNumber`, `eth_getLogs`, and `eth_getBlockByNumber` entirely. RPC usage would drop to near zero (only `eth_call` for quorum). Not available for testnet yet.

*7.3 Reduce redeployment frequency*
Each redeployment that triggers a full resync costs 50,000–100,000+ requests. Minimizing unnecessary redeployments during testing reduces daily consumption.

———————————————————

*8. Summary*

• Current daily limit: 25,000 (free tier)
• Actual daily usage (steady state): *~50,000 – 90,000*
• Actual daily usage (with restarts): *~100,000 – 200,000*
• :rotating_light: *Requested daily limit: 200,000 – 500,000*
• Primary RPC consumer: `eth_getBlockNumber` polling (~50,000–86,000/day)
• Custom RPC calls (quorum): < 10/day (already optimized)
