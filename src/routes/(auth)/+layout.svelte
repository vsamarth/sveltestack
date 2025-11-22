<script lang="ts">
  import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";

  let { children } = $props();
</script>

<div class="grid min-h-svh lg:grid-cols-2">
  <div class="flex flex-col gap-4 p-6 md:p-10">
    <div class="flex justify-center gap-2 md:justify-start">
      <a href="/" class="flex items-center gap-2 font-medium">
        <div
          class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md"
        >
          <GalleryVerticalEndIcon class="size-4" />
        </div>
        Acme Inc.
      </a>
    </div>
    <div class="flex flex-1 items-center justify-center">
      <div class="w-full max-w-sm">
        {@render children()}
      </div>
    </div>
  </div>
  <div class="bg-muted relative hidden lg:block overflow-hidden">
    <div
      class="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black"
    >
      <!-- Subtle accent gradient -->
      <div
        class="absolute inset-0 bg-gradient-to-tr from-slate-900 via-transparent to-slate-800"
      ></div>

      <!-- Minimal geometric shapes -->
      <div
        class="absolute top-20 right-20 w-64 h-64 border-2 border-slate-600/40 rounded-lg rotate-12"
      ></div>
      <div
        class="absolute bottom-32 left-16 w-48 h-48 border-2 border-slate-600/35 rounded-lg -rotate-6"
      ></div>
      <div
        class="absolute top-1/2 right-1/3 w-32 h-32 border-2 border-slate-600/40 rounded-full"
      ></div>

      <!-- Subtle grid pattern -->
      <div
        class="absolute inset-0 opacity-[0.03]"
        style="background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 50px 50px;"
      ></div>

      <!-- Soft light accent -->
      <div
        class="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-slate-800/50 via-transparent to-transparent"
      ></div>
    </div>
  </div>
</div>
