import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Reads the first `networks[].id` from config.yaml so handlers stay aligned with
 * the Envio network (testnet vs mainnet) without hardcoding chain literals that
 * break TypeScript after codegen (`chain` is a literal derived from the same id).
 */
export function getConfiguredNetworkChainId(): number {
  const configPath = join(process.cwd(), 'config.yaml')
  const text = readFileSync(configPath, 'utf8')
  const i = text.indexOf('networks:')
  if (i === -1) {
    throw new Error('config.yaml: missing networks: block')
  }
  const m = text.slice(i).match(/-\s*id:\s*(\d+)/)
  if (!m) {
    throw new Error('config.yaml: could not parse first network id')
  }
  return Number(m[1])
}
