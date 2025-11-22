<svelte:head>
  <title>SvelteStack - SvelteKit Starter Kit</title>
  <meta
    name="description"
    content="A fully open source starter kit for SvelteKit projects"
  />
</svelte:head>

<div class="app">
  <header>
    <nav>
      <a href="/" class="logo">SvelteStack</a>
      <div class="nav-links">
        <a href="/">Home</a>
      </div>
    </nav>
  </header>

  <main>
    <h1>Welcome to SvelteStack</h1>
    <p>Get started by editing <code>src/routes/+page.svelte</code></p>
  </main>

  <footer>
    <p>
      Built with <a
        href="https://kit.svelte.dev"
        target="_blank"
        rel="noopener noreferrer">SvelteKit</a
      >
    </p>
  </footer>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  header {
    border-bottom: 1px solid #e5e7eb;
    background: white;
  }

  nav {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    font-size: 1.5rem;
    font-weight: 700;
    text-decoration: none;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .nav-links a {
    text-decoration: none;
    color: #374151;
    font-weight: 500;
    transition: color 0.2s;
  }

  .nav-links a:hover {
    color: #667eea;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.125rem;
    color: #6b7280;
  }

  code {
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: monospace;
    color: #1f2937;
  }

  footer {
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
    padding: 2rem 1rem;
    text-align: center;
    color: #6b7280;
  }

  footer a {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
  }

  footer a:hover {
    text-decoration: underline;
  }
</style>
