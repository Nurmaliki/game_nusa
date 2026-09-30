import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for node_modules libraries.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// The game is 100% client-side; adapter-vercel still serves the static shell.
		adapter: adapter({ runtime: 'nodejs22.x' }),
		alias: {
			$game: 'src/lib/game',
			$data: 'src/lib/data',
			$stores: 'src/lib/stores',
			$types: 'src/lib/types'
		}
	}
};

export default config;
