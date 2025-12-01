<script lang="ts">
  import {
    Toaster as Sonner,
    type ToasterProps as SonnerProps,
  } from "svelte-sonner";
  import { mode } from "mode-watcher";

  let { ...restProps }: SonnerProps = $props();
</script>

<Sonner
  theme={mode.current}
  class="toaster group"
  toastOptions={{
    unstyled: false,
    classes: {
      toast: "!bg-popover !text-foreground !border-border !shadow-lg",
      title: "!text-foreground !font-medium",
      description: "!text-muted-foreground !opacity-100",
      success: "!bg-popover !text-foreground !border-border",
      error: "!bg-destructive !text-white !border-destructive",
      actionButton: "!bg-primary !text-primary-foreground",
      cancelButton: "!bg-muted !text-muted-foreground",
    },
  }}
  {...restProps}
/>
