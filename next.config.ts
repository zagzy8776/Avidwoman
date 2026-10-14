import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Storefront imagery is served from Unsplash / Cloudinary over https, and the
  // storefront uses plain <img> elements, so no image domain allow-list is needed.
  reactStrictMode: true,
}

export default nextConfig
