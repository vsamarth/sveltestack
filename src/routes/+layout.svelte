<script lang="ts">
  import '../globals.css'

  let { children } = $props();
</script>

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
    {@render children()}
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
    width: 100%;
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
