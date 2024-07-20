import { defineConfig } from 'tsup';

export default defineConfig([
	{
		entry: ['src/index.ts'],
		format: ['esm'],
		dts: true,
		sourcemap: false,
		clean: true,
		platform: 'browser',
		target: 'es2022',
	},
	{
		entry: ['src/index.ts'],
		format: ['esm'],
		dts: false,
		sourcemap: false,
		clean: true,
		platform: 'browser',
		target: 'es2022',
		minify: 'terser',
		outDir: 'dist/min',
	},
	{
		entry: ['src/legacy.ts'],
		format: ['cjs', 'esm'],
		outExtension(ctx) {
			return { js: ctx.format === 'cjs' ? '.cjs' : '.mjs' };
		},
		dts: true,
		sourcemap: false,
		clean: true,
		platform: 'neutral',
		target: 'es5',
		minify: false,
		outDir: 'dist/legacy',
	},
]);
