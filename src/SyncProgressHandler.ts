/**
 * Sync progress block handler.
 * Logs last synced block and upserts SyncProgress entity for GraphQL visibility.
 */

import { onBlock } from '../generated'

const ROOTSTOCK_TESTNET_CHAIN_ID = 31
const SYNC_PROGRESS_INTERVAL_BLOCKS = 500

onBlock(
  {
    name: 'SyncProgressLogger',
    chain: ROOTSTOCK_TESTNET_CHAIN_ID,
    interval: SYNC_PROGRESS_INTERVAL_BLOCKS,
  },
  async ({ block, context }) => {
    const blockNumber = BigInt(block.number)
    context.log.info(
      `SyncProgressLogger: chain ${ROOTSTOCK_TESTNET_CHAIN_ID} last synced block ${blockNumber}`,
    )
    context.SyncProgress.set({
      id: `chain-${ROOTSTOCK_TESTNET_CHAIN_ID}`,
      lastBlock: blockNumber,
      chainId: ROOTSTOCK_TESTNET_CHAIN_ID,
    })
  },
)
