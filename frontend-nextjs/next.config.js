/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_MAIN_API_URL:
      process.env.NEXT_PUBLIC_MAIN_API_URL || 'https://clearledger-ap-production.up.railway.app',
  },
};
