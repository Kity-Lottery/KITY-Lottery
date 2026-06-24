/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // wagmi / viem pull in optional deps we don't use.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // The MetaMask SDK (transitively pulled by connectors) references an
    // optional React Native storage module that doesn't exist in a web build.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
