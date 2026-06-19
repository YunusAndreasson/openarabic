export default {
  // The parent monorepo's package.json declares `packageManager: yarn`, which makes
  // pnpm refuse to run from this subdir. OpenNext defaults to `pnpm build`, so invoke
  // the local Next binary directly to sidestep the package-manager check.
  buildCommand: 'node_modules/.bin/next build',
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
  edgeExternals: ['node:crypto'],
  middleware: {
    external: true,
    override: {
      wrapper: 'cloudflare-edge',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
};
