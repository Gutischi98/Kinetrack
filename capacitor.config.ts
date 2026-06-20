import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aleeh.kinetrackV2",
  appName: "Kinetrack V2",
  webDir: "dist",
  plugins: {
    StatusBar: {
      style: "DARK",
    },
  },
};

export default config;
