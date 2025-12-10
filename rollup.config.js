import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';

const isProduction = process.env.NODE_ENV === 'production';

const external = ['axios', 'ably', 'react', 'react-dom', 'react/jsx-runtime', 'qrcode.react'];
const globals = {
  axios: 'axios',
  ably: 'Ably',
  react: 'React',
  'react-dom': 'ReactDOM',
  'qrcode.react': 'QRCode',
};

export default [
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    external: ['axios', 'ably'],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
        rootDir: 'src',
      }),
      isProduction && terser(),
    ].filter(Boolean),
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external: ['axios', 'ably'],
    plugins: [
      resolve({
        browser: false,
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
      isProduction && terser(),
    ].filter(Boolean),
  },
  // UMD build for browsers
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'LoyaltySDK',
      sourcemap: true,
      globals: {
        axios: 'axios',
        ably: 'Ably',
      },
    },
    external: ['axios', 'ably'],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
      isProduction && terser(),
      copy({
        targets: [
          { src: 'src/components/styles.css', dest: 'dist' }
        ]
      }),
    ].filter(Boolean),
  },
  // React components - ES Module
  {
    input: 'src/react.ts',
    output: {
      file: 'dist/react.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    external,
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
        rootDir: 'src',
      }),
      isProduction && terser(),
    ].filter(Boolean),
  },
  // React components - CommonJS
  {
    input: 'src/react.ts',
    output: {
      file: 'dist/react.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins: [
      resolve({
        browser: false,
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
      isProduction && terser(),
    ].filter(Boolean),
  },
];
