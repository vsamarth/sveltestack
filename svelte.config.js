import adapterAuto from "@sveltejs/adapter-auto";
import adapterVercel from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// Use Vercel adapter when building on Vercel, auto adapter otherwise
const adapter = process.env.VERCEL ? adapterVercel : adapterAuto;

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),
    experimental: {
      remoteFunctions: true,
    }
  }
};

export default config;
