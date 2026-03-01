/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: '/-UI-UX-',     // 必须匹配你的仓库名
  assetPrefix: '/-UI-UX-/', // 结尾的斜杠非常重要！
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
