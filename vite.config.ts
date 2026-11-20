import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			preprocess: vitePreprocess(),
			adapter: adapter(),
			// SvelteKit 3 dropped `$lib`; this alias feeds both Vite and the
			// generated tsconfig paths. Import shared code as `#lib/...`.
			alias: { '#lib': 'src/lib' }
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
