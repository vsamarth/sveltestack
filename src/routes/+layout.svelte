<script lang="ts">
  import "../globals.css";
  import { Toaster } from "$lib/components/ui/sonner";

  let { children } = $props();
</script>

<Toaster />
{@render children()}
