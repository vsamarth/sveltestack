<script lang="ts">
  import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
  import ThemeToggle from "$lib/components/theme-toggle.svelte";

  let { children } = $props();
</script>

<div class="grid min-h-svh lg:grid-cols-2">
  <div class="flex flex-col gap-4 p-6 md:p-10">
    <div class="flex justify-between items-center">
      <a href="/" class="flex items-center gap-2 font-medium">
        <div
          class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md"
        >
          <GalleryVerticalEndIcon class="size-4" />
        </div>
        Vault
      </a>
      <ThemeToggle />
    </div>
    <div class="flex flex-1 items-center justify-center">
      <div class="w-full max-w-sm">
        {@render children()}
      </div>
    </div>
  </div>
  <div class="bg-muted relative hidden lg:block overflow-hidden">
    <div
      class="absolute inset-0 bg-linear-to-br from-slate-900 via-slate-800 to-black"
    ></div>
  </div>
</div>
