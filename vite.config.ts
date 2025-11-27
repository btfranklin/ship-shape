import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  root: 'www',
  server: {
    fs: {
      allow: ['..']
    }
  },
  // Configure the dependency optimization (pre-bundling)
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: 'resolve-ts-imports',
          setup(build) {
            // Intercept resolution of imports ending in .js
            build.onResolve({ filter: /\.js$/ }, (args) => {
              // If the import starts with '.' or '..', it's a relative import
              if (args.path.startsWith('.')) {
                // Construct the absolute path of the imported file
                const resolveDir = args.resolveDir;
                const importedFile = path.resolve(resolveDir, args.path);

                // If the file doesn't exist as .js, check if .ts exists
                if (!fs.existsSync(importedFile)) {
                  const tsFile = importedFile.replace(/\.js$/, '.ts');
                  if (fs.existsSync(tsFile)) {
                    return { path: tsFile };
                  }
                }
              }
              return null; // Use default resolution
            });
          },
        },
      ],
    },
  },
  plugins: [
    {
      // This plugin handles serving the files during dev (runtime)
      name: 'rewrite-js-imports',
      enforce: 'pre',
      transform(code, id) {
        if (id.endsWith('.ts')) {
          // Rewrite relative imports ending in .js to no extension
          return code.replace(/from\s+['"](\.[^'"]+)\.js['"]/g, "from '$1'");
        }
        return null;
      },
    },
  ],
});
