import type { NextConfig } from 'next'
const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['ssh2'],
}
export default config
