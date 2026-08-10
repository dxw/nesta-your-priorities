import { esbuildPlugin } from '@web/dev-server-esbuild';
import { legacyPlugin } from '@web/dev-server-legacy';
import { fromRollup } from '@web/dev-server-rollup';
import rollupCommonjs from '@rollup/plugin-commonjs';

const commonjs = fromRollup(rollupCommonjs);

export default {
  nodeResolve: {
    browser: true,
  },
  preserveSymlinks: true,
  files: 'src/**/*.test.ts',
  plugins: [
    commonjs({
      include: [
        '**/node_modules/debug/**',
        '**/node_modules/glob-to-regexp/**',
        '**/node_modules/is-subset/**',
        '**/node_modules/i18next-http-backend/**',
        '**/node_modules/fetch-mock/**',
        '**/node_modules/lodash.isequal/**',
        '**/node_modules/ms/**',
        '**/node_modules/path-to-regexp/**',
        '**/node_modules/querystring/**',
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
