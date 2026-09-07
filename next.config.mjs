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
    /*
      검색에 노출되어야 하는 주소는 choice.ymstudio.co.kr 하나뿐이다.

      Vercel 은 프로젝트마다 *.vercel.app 주소를 자동으로 붙이고 브랜치마다
      미리보기 주소를 또 만든다. 내용이 똑같은 사이트가 주소만 달리해 여러 벌
      존재하는 셈이라, 구글이 "사용자가 선택한 표준이 없는 중복 페이지"로 보고
      색인에서 뺐다. Search Console 에서 실제로 그 사유로 통보를 받았다.

      리디렉션이 아니라 색인 거부로 막는다. 미리보기 주소는 배포 전 확인에
      계속 써야 하므로 접속 자체는 막지 않는다.
    */
    async headers() {
      return [
        {
          source: "/:path*",
          missing: [{ type: "host", value: "choice.ymstudio.co.kr" }],
          headers: [
            { key: "X-Robots-Tag", value: "noindex, nofollow" },
          ],
        },
      ];
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