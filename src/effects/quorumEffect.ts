/**
 * Quorum Effect
 *
 * Fetches quorum from Governor contract at a specific block (voteStart).
 * Uses Envio Effect API for caching and proper RPC handling.
 */

import { createEffect, S } from "envio"
import { createPublicClient, http, type Address } from "viem"
import { rootstock, rootstockTestnet } from "viem/chains"
import GovernorAbi from "../../abis/Governor.json"
import { getConfiguredNetworkChainId } from "../configChain"

const configuredChainId = getConfiguredNetworkChainId()
const viemChain = configuredChainId === 30 ? rootstock : rootstockTestnet
const defaultRpc =
  configuredChainId === 30
    ? "https://public-node.rsk.co"
    : "https://public-node.testnet.rsk.co"

const RPC_URL = process.env["ENVIO_RPC_URL"] ?? defaultRpc

const client = createPublicClient({
  chain: viemChain,
  transport: http(RPC_URL, { batch: true }),
})

/**
 * Effect to fetch quorum at a specific block number.
 *
 * The Governor contract's quorum(blockNumber) function returns the
 * required quorum (in wei) at that snapshot block.
 */
export const getQuorum = createEffect(
  {
    name: "getQuorum",
    input: {
      voteStart: S.bigint,
      governorAddress: S.string,
    },
    output: S.bigint,
    cache: true,
    rateLimit: {
      calls: 10,
      per: "second",
    },
  },
  async ({ input, context }) => {
    try {
      const quorum = await client.readContract({
        address: input.governorAddress as Address,
        abi: GovernorAbi,
        functionName: "quorum",
        args: [input.voteStart],
      })

      return quorum as bigint
    } catch (error) {
      context.log.warn(`Failed to fetch quorum for voteStart ${input.voteStart}: ${error}`)
      return 0n
    }
  }
)
