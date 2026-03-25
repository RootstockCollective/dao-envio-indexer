/**
 * Sync progress block handler.
 * Logs last synced block and upserts SyncProgress entity for GraphQL visibility.
 */

import type { chain } from '../generated'
import { onBlock } from '../generated'
import { getConfiguredNetworkChainId } from './configChain'

const SYNC_PROGRESS_CHAIN_ID = getConfiguredNetworkChainId() as chain
const SYNC_PROGRESS_INTERVAL_BLOCKS = 500

onBlock(
  {
    name: 'SyncProgressLogger',
    chain: SYNC_PROGRESS_CHAIN_ID,
    interval: SYNC_PROGRESS_INTERVAL_BLOCKS,
  },
  async ({ block, context }) => {
    const blockNumber = BigInt(block.number)
    context.log.info(
      `SyncProgressLogger: chain ${SYNC_PROGRESS_CHAIN_ID} last synced block ${blockNumber}`,
    )
    context.SyncProgress.set({
      id: `chain-${SYNC_PROGRESS_CHAIN_ID}`,
      lastBlock: blockNumber,
      chainId: SYNC_PROGRESS_CHAIN_ID,
    })
  },
)
