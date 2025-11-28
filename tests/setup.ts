// Vitest setup file to suppress SvelteKit remote function validation errors in tests
// This is needed because SvelteKit validates remote functions at import time,
// but we need to import them directly in tests for integration testing.

// Note: The actual error suppression happens in vite.config.ts via the plugin
// This file is here for any additional test setup if needed
