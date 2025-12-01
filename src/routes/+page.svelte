<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Shield,
    UserPlus,
    FileText,
    Mail,
    CheckCircle2,
    Github,
    Sparkles,
    Upload,
    Eye,
    Folder,
    Lock,
  } from "@lucide/svelte";
  import { siteConfig } from "$lib/config";
</script>

<svelte:head>
  <title>{siteConfig.name} - {siteConfig.description}</title>
  <meta name="description" content={siteConfig.description} />
  <meta
    property="og:title"
    content="{siteConfig.name} - A reasonable foundation for ambitious Svelte apps"
  />
  <meta property="og:description" content={siteConfig.description} />
  <meta property="og:url" content={siteConfig.url} />
  <meta
    name="twitter:title"
    content="{siteConfig.name} - A reasonable foundation for ambitious Svelte apps"
  />
  <meta name="twitter:description" content={siteConfig.description} />
  <link rel="canonical" href={siteConfig.url} />
</svelte:head>

<main class="min-h-screen">
  <!-- Hero Section with integrated header -->
  <section class="gradient-hero">
    <!-- Transparent Header -->
    <header class="container mx-auto px-4 py-6 max-w-7xl">
      <div class="flex items-center gap-2">
        <div
          class="size-8 rounded-lg bg-foreground flex items-center justify-center"
        >
          <Sparkles class="size-5 text-background" />
        </div>
        <span class="text-xl font-semibold">SvelteStack</span>
      </div>
    </header>

    <!-- Hero Content -->
    <div class="py-20 md:py-28">
      <div
        class="container mx-auto px-4 flex flex-col items-center text-center max-w-4xl"
      >
        <div
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 border border-border/50 mb-6 text-sm text-muted-foreground animate-fade-in-up"
        >
          <Sparkles class="size-3.5" />
          <span>Open Source Starter Kit</span>
        </div>

        <h1
          class="text-5xl md:text-7xl lg:text-8xl font-display font-bold mb-6 text-foreground leading-tight tracking-normal opacity-0 animate-fade-in-up"
          style="animation-delay: 0.1s"
        >
          A reasonable foundation<br />for ambitious Svelte apps.
        </h1>

        <p
          class="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl opacity-0 animate-fade-in-up"
          style="animation-delay: 0.2s"
        >
          SvelteStack provides the essential building blocks that every real
          product eventually needs. Not a bloated template. Just solid,
          production-ready primitives.
        </p>

        <div
          class="flex flex-col sm:flex-row gap-4 items-center justify-center opacity-0 animate-fade-in-up"
          style="animation-delay: 0.3s"
        >
          <Button href="/dashboard" size="lg" class="text-base px-8 py-6">
            Try Demo
          </Button>
          <Button
            href={siteConfig.repository}
            variant="outline"
            size="lg"
            class="text-base px-8 py-6 gap-2"
          >
            <Github class="size-4" />
            Star on GitHub
          </Button>
        </div>

        <div
          class="flex items-center gap-2 mt-10 opacity-0 animate-fade-in-up"
          style="animation-delay: 0.4s"
        >
          <div
            class="flex items-center gap-2 px-4 py-2 rounded-full bg-background/60 backdrop-blur-sm border border-border/50"
          >
            <svg
              class="size-4 text-green-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span class="text-sm font-medium">Free and open source</span>
            <span class="text-muted-foreground">·</span>
            <span class="text-sm text-muted-foreground">MIT licensed</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Core Building Blocks Section -->
  <section class="py-24 container mx-auto px-4 max-w-7xl">
    <div class="text-center mb-16">
      <h2
        class="text-3xl md:text-4xl font-display font-bold mb-4 tracking-normal"
      >
        Core Building Blocks
      </h2>
      <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
        Use what you need. Safely delete what you don't. No hidden dependencies,
        no lock-in.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Authentication -->
      <div
        class="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow duration-300"
      >
        <div
          class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <Shield class="size-5 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Authentication</h3>
        <p class="text-sm text-muted-foreground">
          Secure email/password auth with better-auth, Argon2 hashing, and
          session management
        </p>
      </div>

      <!-- Workspaces / Organizations -->
      <div
        class="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow duration-300"
      >
        <div
          class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <Folder class="size-5 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Workspaces & Organizations</h3>
        <p class="text-sm text-muted-foreground">
          Create, organize, and manage workspaces with multi-tenant isolation
        </p>
      </div>

      <!-- Members & Invites -->
      <div
        class="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow duration-300"
      >
        <div
          class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <UserPlus class="size-5 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Members & Invites</h3>
        <p class="text-sm text-muted-foreground">
          Invite team members with email-based invitations and member management
        </p>
      </div>

      <!-- Activity Logs -->
      <div
        class="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow duration-300"
      >
        <div
          class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <FileText class="size-5 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Activity Logs</h3>
        <p class="text-sm text-muted-foreground">
          Monitor and track user activities with comprehensive logging
        </p>
      </div>

      <!-- Transactional Emails -->
      <div
        class="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow duration-300"
      >
        <div
          class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <Mail class="size-5 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Transactional Emails</h3>
        <p class="text-sm text-muted-foreground">
          Email verification, password resets, and workspace invites with Resend
        </p>
      </div>

      <!-- Thorough Tests -->
      <div
        class="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow duration-300"
      >
        <div
          class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
        >
          <CheckCircle2 class="size-5 text-primary" />
        </div>
        <h3 class="text-lg font-semibold mb-2">Thorough Tests</h3>
        <p class="text-sm text-muted-foreground">
          Comprehensive test coverage with Vitest and Playwright for reliability
        </p>
      </div>
    </div>
  </section>

  <!-- Get Started / Built With -->
  <section class="py-24 container mx-auto px-4 max-w-6xl">
    <div class="grid md:grid-cols-2 gap-12 items-start">
      <!-- Get Started -->
      <div>
        <h2
          class="text-2xl md:text-3xl font-display font-bold mb-6 tracking-normal"
        >
          Get Started
        </h2>
        <div
          class="rounded-xl bg-[#1e1e1e] text-white overflow-hidden shadow-xl"
        >
          <!-- Terminal header -->
          <div
            class="flex items-center gap-2 px-4 py-3 bg-[#2d2d2d] border-b border-[#3d3d3d]"
          >
            <div class="flex gap-1.5">
              <div class="size-3 rounded-full bg-[#ff5f57]"></div>
              <div class="size-3 rounded-full bg-[#febc2e]"></div>
              <div class="size-3 rounded-full bg-[#28c840]"></div>
            </div>
            <span class="text-xs text-[#8b8b8b] ml-2 font-mono">terminal</span>
          </div>
          <!-- Terminal content -->
          <div class="p-4 font-mono text-sm leading-relaxed">
            <div class="flex">
              <span class="text-[#7ee787] select-none">$</span>
              <span class="ml-2">git clone {siteConfig.repository}.git</span>
            </div>
            <div class="flex mt-1">
              <span class="text-[#7ee787] select-none">$</span>
              <span class="ml-2">cd sveltestack</span>
            </div>
            <div class="flex mt-1">
              <span class="text-[#7ee787] select-none">$</span>
              <span class="ml-2">npm install</span>
            </div>
            <div class="flex mt-1">
              <span class="text-[#7ee787] select-none">$</span>
              <span class="ml-2">npm run dev</span>
            </div>
          </div>
        </div>
        <p class="text-sm text-muted-foreground mt-4">
          That's it. You're running a full-stack app with auth, workspaces, and
          more.
        </p>
      </div>

      <!-- Built With -->
      <div>
        <h2
          class="text-2xl md:text-3xl font-display font-bold mb-6 tracking-normal"
        >
          Built With
        </h2>
        <div class="grid grid-cols-2 gap-3">
          <!-- SvelteKit -->
          <div
            class="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
          >
            <p class="font-medium text-sm">SvelteKit</p>
            <p class="text-xs text-muted-foreground">Svelte 5</p>
          </div>

          <!-- Drizzle -->
          <div
            class="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
          >
            <p class="font-medium text-sm">Drizzle ORM</p>
            <p class="text-xs text-muted-foreground">Type-safe SQL</p>
          </div>

          <!-- PostgreSQL -->
          <div
            class="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
          >
            <p class="font-medium text-sm">PostgreSQL</p>
            <p class="text-xs text-muted-foreground">Database</p>
          </div>

          <!-- better-auth -->
          <div
            class="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
          >
            <p class="font-medium text-sm">better-auth</p>
            <p class="text-xs text-muted-foreground">Authentication</p>
          </div>

          <!-- Resend -->
          <div
            class="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
          >
            <p class="font-medium text-sm">Resend</p>
            <p class="text-xs text-muted-foreground">Email</p>
          </div>

          <!-- Tailwind -->
          <div
            class="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
          >
            <p class="font-medium text-sm">Tailwind CSS</p>
            <p class="text-xs text-muted-foreground">Styling</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Vault Showcase Section -->
  <section class="gradient-subtle py-24">
    <div class="container mx-auto px-4 max-w-6xl">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 border border-border/50 mb-6 text-sm text-muted-foreground"
          >
            <Sparkles class="size-3.5" />
            <span>Reference Application</span>
          </div>
          <h2
            class="text-3xl md:text-4xl font-display font-bold mb-4 tracking-normal"
          >
            See it in action: Vault
          </h2>
          <p class="text-lg text-muted-foreground mb-6">
            Vault is a fully working file management tool built on top of
            SvelteStack's primitives. It demonstrates how easy it is to build
            real features using the foundation.
          </p>
          <ul class="space-y-3 mb-8">
            <li class="flex items-start gap-3">
              <div
                class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"
              >
                <Upload class="size-3 text-primary" />
              </div>
              <span class="text-muted-foreground"
                >File uploads with drag-and-drop</span
              >
            </li>
            <li class="flex items-start gap-3">
              <div
                class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"
              >
                <Eye class="size-3 text-primary" />
              </div>
              <span class="text-muted-foreground"
                >File previews and metadata</span
              >
            </li>
            <li class="flex items-start gap-3">
              <div
                class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"
              >
                <Folder class="size-3 text-primary" />
              </div>
              <span class="text-muted-foreground"
                >Workspace-aware file management</span
              >
            </li>
            <li class="flex items-start gap-3">
              <div
                class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"
              >
                <Lock class="size-3 text-primary" />
              </div>
              <span class="text-muted-foreground"
                >Access control and permissions</span
              >
            </li>
          </ul>
          <Button href="/dashboard" size="lg">Try Vault Demo</Button>
        </div>
        <div class="rounded-xl border bg-card p-8 shadow-lg">
          <div class="space-y-4">
            <div
              class="h-48 rounded-lg bg-muted/50 flex items-center justify-center"
            >
              <div class="text-center">
                <Folder class="size-12 text-muted-foreground mx-auto mb-2" />
                <p class="text-sm text-muted-foreground">
                  Vault Interface Preview
                </p>
              </div>
            </div>
            <p class="text-sm text-muted-foreground text-center">
              Vault showcases file uploads, previews, renaming, deletion, and
              workspace-level organization—all built on SvelteStack primitives.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t py-12">
    <div class="container mx-auto px-4 max-w-7xl">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <p class="text-sm text-muted-foreground text-center md:text-left">
          MIT License · Free forever
        </p>
        <div class="flex items-center gap-4">
          <a
            href={siteConfig.repository}
            class="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Github class="size-4" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </div>
  </footer>
</main>

<style>
  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in-up {
    animation: fade-in-up 0.6s ease-out forwards;
  }
</style>
