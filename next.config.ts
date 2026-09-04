import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.0.112'],
}

export default nextConfig
