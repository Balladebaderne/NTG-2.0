import { defineConfig, loadEnv } from 'vite'

const apiPrefixes = [
  '/auth',
  '/chat',
  '/conversations',
  '/customers',
  '/drivers',
  '/notifications',
  '/routes',
  '/search',
  '/senders',
  '/shipments',
  '/tickets',
  '/tracking',
]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gatewayUrl = env.VITE_BACKEND_URL || env.BACKEND_URL || 'http://localhost'
  const proxyTarget = gatewayUrl.endsWith('/') ? gatewayUrl.slice(0, -1) : gatewayUrl

  return {
    server: {
      proxy: Object.fromEntries(
        apiPrefixes.map((prefix) => [
          prefix,
          {
            changeOrigin: true,
            target: proxyTarget,
          },
        ]),
      ),
    },
  }
})
