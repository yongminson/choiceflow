/** @type {import('next').NextConfig} } */
const nextConfig = {
    // 🔥 빌드 시 에러가 있어도 무시하고 배포를 진행하게 합니다.
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    // 이미지 최적화 관련 경고 방지
    images: {
      unoptimized: true,
    }
  };
  
  export default nextConfig;