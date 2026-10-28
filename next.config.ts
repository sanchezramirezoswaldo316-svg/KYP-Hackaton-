import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las listas oficiales se leen del disco en tiempo de ejecución: hay que incluirlas en las funciones.
  outputFileTracingIncludes: {
    "/**/*": ["./src/data/**/*.json"],
  },
};

export default nextConfig;
