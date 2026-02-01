import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  productionBrowserSourceMaps: false,
 
  /* allowing the origins  */
  experimental: {
  	allowedDevOrigins: [
		"http://65.1.100.65:3000",
		"http://localhost:3000"
	]
  }

};

export default nextConfig;
