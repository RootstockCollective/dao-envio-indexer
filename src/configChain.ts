import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'

/**
 * Finds config.yaml: hosted Envio often runs with cwd = .../generated, while the file
 * lives at the indexer root next to /src.
 */
function resolveConfigPath(): string {
  let dir = process.cwd()
  for (let depth = 0; depth < 8; depth++) {
    const candidate = join(dir, 'config.yaml')
    if (existsSync(candidate)) {
      return candidate
    }
    const parent = dirname(dir)
    if (parent === dir) {
      break
    }
    dir = parent
  }
  throw new Error(
    `config.yaml not found (walked up from cwd ${process.cwd()})`,
  )
}

/**
 * Reads the first `networks[].id` from config.yaml so handlers stay aligned with
 * the Envio network (testnet vs mainnet) without hardcoding chain literals that
 * break TypeScript after codegen (`chain` is a literal derived from the same id).
 */
export function getConfiguredNetworkChainId(): number {
  const text = readFileSync(resolveConfigPath(), 'utf8')
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
