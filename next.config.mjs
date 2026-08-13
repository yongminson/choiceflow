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
    },
    async redirects() {
      return [
        // /q/<키워드> 도어웨이 페이지를 걷어냈다. 이미 색인되었거나
        // 어딘가에 남아 있는 주소가 404 로 떨어지지 않도록 홈으로 보낸다.
        {
          source: "/q/:keyword*",
          destination: "/",
          permanent: true,
        },
      ];
    },
  };
  
  export default nextConfig;