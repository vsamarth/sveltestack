<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Rocket,
    Code,
    Database,
    Shield,
    Github,
    Lock,
    Upload,
    FileCode,
    Palette,
    Zap,
  } from "@lucide/svelte";
  import { siteConfig } from "$lib/config";
</script>

<svelte:head>
  <title>{siteConfig.name} - Secure File Storage</title>
  <meta name="description" content={siteConfig.description} />
  <meta
    property="og:title"
    content="{siteConfig.name} - Secure File Storage & Workspace Management"
  />
  <meta property="og:description" content={siteConfig.description} />
  <meta property="og:url" content={siteConfig.url} />
  <meta
    name="twitter:title"
    content="{siteConfig.name} - Secure File Storage & Workspace Management"
  />
  <meta name="twitter:description" content={siteConfig.description} />
  <link rel="canonical" href={siteConfig.url} />
</svelte:head>

<main class="min-h-screen">
  <!-- Hero Section -->
  <section
    class="container mx-auto px-4 py-20 md:py-32 flex flex-col items-center text-center max-w-4xl"
  >
    <h1
      class="text-5xl md:text-7xl font-bold mb-6 text-foreground leading-tight tracking-tight"
    >
      Production-ready<br />SvelteKit starter
    </h1>

    <p class="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl">
      An opinionated collection of components, hooks, and utilities for your
      SvelteKit project.
    </p>

    <div class="flex flex-col sm:flex-row gap-4 items-center justify-center">
      <Button href="/register" size="lg" class="text-base px-6 py-5 gap-2">
        Try {siteConfig.name} Demo
      </Button>
      <Button
        href={siteConfig.repository}
        variant="outline"
        size="lg"
        class="text-base px-6 py-5 gap-2"
      >
        <Github class="size-4" />
        Star on GitHub
      </Button>
    </div>
  </section>
  <section class="container mx-auto px-4 py-16 max-w-6xl">
    <div class="text-center mb-12">
      <h2 class="text-3xl md:text-4xl font-bold mb-4">Meet Vault</h2>
      <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
        A fully-functional file storage and workspace management app that ships
        with SvelteStack. See real-world authentication, database patterns, and
        file uploads in action—not just a hello world.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-8 rounded-xl border bg-card">
        <div
          class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <Lock class="size-6 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Secure Authentication</h3>
        <p class="text-sm text-muted-foreground">
          Email/password auth with better-auth, Argon2 hashing, and session
          management
        </p>
      </div>

      <div class="p-8 rounded-xl border bg-card">
        <div
          class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <FileCode class="size-6 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Workspace Management</h3>
        <p class="text-sm text-muted-foreground">
          Create, organize, and manage workspaces with multi-tenant isolation
        </p>
      </div>

      <div class="p-8 rounded-xl border bg-card">
        <div
          class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <Upload class="size-6 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">File Storage</h3>
        <p class="text-sm text-muted-foreground">
          S3-compatible storage with drag-and-drop uploads and presigned URLs
        </p>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="container mx-auto px-4 py-16 max-w-6xl">
    <div class="text-center mb-12">
      <h2 class="text-3xl md:text-4xl font-bold mb-4">What's Included</h2>
      <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
        Everything you need for production-ready applications, not just a basic
        template
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="p-8 rounded-xl border bg-card">
        <div
          class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <Rocket class="size-6 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">SvelteKit + Svelte 5</h3>
        <p class="text-sm text-muted-foreground">
          Latest SvelteKit with Svelte 5 runes for better reactivity and
          performance
        </p>
      </div>

      <div class="p-8 rounded-xl border bg-card">
        <div
          class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <Shield class="size-6 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Complete Auth System</h3>
        <p class="text-sm text-muted-foreground">
          better-auth integration with email/password, sessions, and secure
          password hashing
        </p>
      </div>

      <div class="p-8 rounded-xl border bg-card">
        <div
          class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <Database class="size-6 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Database Ready</h3>
        <p class="text-sm text-muted-foreground">
          PostgreSQL with Drizzle ORM, migrations, seeding, and Docker setup
        </p>
      </div>

      <div class="p-8 rounded-xl border bg-card">
        <div
          class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <Code class="size-6 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Full TypeScript</h3>
        <p class="text-sm text-muted-foreground">
          End-to-end type safety with strict mode and proper type inference
        </p>
      </div>

      <div class="p-8 rounded-xl border bg-card">
        <div
          class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <Palette class="size-6 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Modern UI Components</h3>
        <p class="text-sm text-muted-foreground">
          shadcn-svelte components with Tailwind CSS and accessible design
          patterns
        </p>
      </div>

      <div class="p-8 rounded-xl border bg-card">
        <div
          class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <Zap class="size-6 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">S3 File Storage</h3>
        <p class="text-sm text-muted-foreground">
          Complete file upload with Uppy, presigned URLs, and S3-compatible
          storage
        </p>
      </div>
    </div>
  </section>
</main>
