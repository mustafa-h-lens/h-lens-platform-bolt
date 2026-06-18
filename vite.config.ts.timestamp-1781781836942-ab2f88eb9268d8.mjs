// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { execSync } from "child_process";
function tryExec(cmd, fallback) {
  try {
    return execSync(cmd).toString().trim();
  } catch {
    return fallback;
  }
}
var commitHash = tryExec("git rev-parse --short HEAD", "unknown");
var commitMsg = tryExec("git log -1 --format=%s", "");
var commitDate = tryExec("git log -1 --format=%ci", (/* @__PURE__ */ new Date()).toISOString());
var vite_config_default = defineConfig({
  plugins: [react()],
  define: {
    __GIT_COMMIT__: JSON.stringify(commitHash),
    __GIT_MSG__: JSON.stringify(commitMsg),
    __GIT_DATE__: JSON.stringify(commitDate)
  },
  server: {
    port: 5190,
    strictPort: true
  },
  preview: {
    port: 5190,
    strictPort: true
  },
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "vendor";
          if (id.includes("node_modules/@supabase")) return "supabase";
          if (id.includes("node_modules/lucide-react")) return "icons";
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBleGVjU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuXG5mdW5jdGlvbiB0cnlFeGVjKGNtZDogc3RyaW5nLCBmYWxsYmFjazogc3RyaW5nKTogc3RyaW5nIHtcbiAgdHJ5IHsgcmV0dXJuIGV4ZWNTeW5jKGNtZCkudG9TdHJpbmcoKS50cmltKCk7IH0gY2F0Y2ggeyByZXR1cm4gZmFsbGJhY2s7IH1cbn1cblxuY29uc3QgY29tbWl0SGFzaCA9IHRyeUV4ZWMoJ2dpdCByZXYtcGFyc2UgLS1zaG9ydCBIRUFEJywgJ3Vua25vd24nKTtcbmNvbnN0IGNvbW1pdE1zZyA9IHRyeUV4ZWMoJ2dpdCBsb2cgLTEgLS1mb3JtYXQ9JXMnLCAnJyk7XG5jb25zdCBjb21taXREYXRlID0gdHJ5RXhlYygnZ2l0IGxvZyAtMSAtLWZvcm1hdD0lY2knLCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICBkZWZpbmU6IHtcbiAgICBfX0dJVF9DT01NSVRfXzogSlNPTi5zdHJpbmdpZnkoY29tbWl0SGFzaCksXG4gICAgX19HSVRfTVNHX186IEpTT04uc3RyaW5naWZ5KGNvbW1pdE1zZyksXG4gICAgX19HSVRfREFURV9fOiBKU09OLnN0cmluZ2lmeShjb21taXREYXRlKSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE5MCxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICB9LFxuICBwcmV2aWV3OiB7XG4gICAgcG9ydDogNTE5MCxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICB9LFxuICBidWlsZDoge1xuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IChpZCkgPT4ge1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3JlYWN0JykgfHwgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC1kb20nKSkgcmV0dXJuICd2ZW5kb3InO1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0BzdXBhYmFzZScpKSByZXR1cm4gJ3N1cGFiYXNlJztcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9sdWNpZGUtcmVhY3QnKSkgcmV0dXJuICdpY29ucyc7XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZ0JBQWdCO0FBRXpCLFNBQVMsUUFBUSxLQUFhLFVBQTBCO0FBQ3RELE1BQUk7QUFBRSxXQUFPLFNBQVMsR0FBRyxFQUFFLFNBQVMsRUFBRSxLQUFLO0FBQUEsRUFBRyxRQUFRO0FBQUUsV0FBTztBQUFBLEVBQVU7QUFDM0U7QUFFQSxJQUFNLGFBQWEsUUFBUSw4QkFBOEIsU0FBUztBQUNsRSxJQUFNLFlBQVksUUFBUSwwQkFBMEIsRUFBRTtBQUN0RCxJQUFNLGFBQWEsUUFBUSw0QkFBMkIsb0JBQUksS0FBSyxHQUFFLFlBQVksQ0FBQztBQUc5RSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsUUFBUTtBQUFBLElBQ04sZ0JBQWdCLEtBQUssVUFBVSxVQUFVO0FBQUEsSUFDekMsYUFBYSxLQUFLLFVBQVUsU0FBUztBQUFBLElBQ3JDLGNBQWMsS0FBSyxVQUFVLFVBQVU7QUFBQSxFQUN6QztBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsY0FBYztBQUFBLEVBQzFCO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjLENBQUMsT0FBTztBQUNwQixjQUFJLEdBQUcsU0FBUyxvQkFBb0IsS0FBSyxHQUFHLFNBQVMsd0JBQXdCLEVBQUcsUUFBTztBQUN2RixjQUFJLEdBQUcsU0FBUyx3QkFBd0IsRUFBRyxRQUFPO0FBQ2xELGNBQUksR0FBRyxTQUFTLDJCQUEyQixFQUFHLFFBQU87QUFBQSxRQUN2RDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
