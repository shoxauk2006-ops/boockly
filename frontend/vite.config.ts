import { defineConfig, type Plugin } from 'vite';

function repairAdminJsx(): Plugin {
  return {
    name: 'repair-admin-jsx',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/main.tsx')) return null;

      const marker = "\n      <div className=\"business-head\">";
      const endMarker = "\n\n);\n}\n\nfunction BusinessForm";

      if (!code.includes(marker)) return null;
      if (!code.includes(endMarker)) return null;

      const repaired = code.replace(
        marker,
        "\n      return (\n        <div className=\"admin-page\">\n      <div className=\"business-head\">",
      ).replace(
        endMarker,
        "\n      </div>\n    );\n}\n\nfunction BusinessForm",
      );

      return repaired === code ? null : { code: repaired, map: null };
    },
  };
}

export default defineConfig({
  plugins: [repairAdminJsx()],
  build: {
    cssMinify: 'esbuild', // Добавили этот блок, чтобы убрать ошибку минификатора CSS
  },
});
