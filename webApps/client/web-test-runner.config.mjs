import { esbuildPlugin } from '@web/dev-server-esbuild';
import { legacyPlugin } from '@web/dev-server-legacy';
import { fromRollup } from '@web/dev-server-rollup';
import rollupCommonjs from '@rollup/plugin-commonjs';

const commonjs = fromRollup(rollupCommonjs);

export default {
  nodeResolve: true,
  preserveSymlinks: true,
  files: 'src/**/*.test.ts',
  plugins: [
    commonjs({
      include: [
        '**/node_modules/i18next-http-backend/**',
        '**/node_modules/fetch-mock/**',
      ],
    }),
    esbuildPlugin({
      ts: true,
      tsconfig: './tsconfig.json',
      loaders: {
        '.ts': 'ts',
      },
    }),
    legacyPlugin({
      polyfills: {
        webcomponents: false,
      },
    }),
  ],
};
