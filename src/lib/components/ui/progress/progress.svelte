<script lang="ts" module>
  import { cn } from "$lib/utils.js";
  import { type VariantProps, tv } from "tailwind-variants";
  import type { HTMLAttributes } from "svelte/elements";
  import type { WithElementRef } from "$lib/utils.js";

  export const progressVariants = tv({
    slots: {
      root: "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      indicator: "h-full flex-1 transition-all duration-300 ease-out",
    },
    variants: {
      variant: {
        default: {
          indicator: "bg-primary",
        },
        success: {
          indicator: "bg-emerald-500",
        },
        warning: {
          indicator: "bg-amber-500",
        },
        destructive: {
          indicator: "bg-destructive",
        },
      },
    },
    defaultVariants: {
      variant: "default",
    },
  });

  export type ProgressVariant = VariantProps<
    typeof progressVariants
  >["variant"];
  export type ProgressProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    value?: number;
    max?: number;
    variant?: ProgressVariant;
    indeterminate?: boolean;
  };
</script>

<script lang="ts">
  let {
    ref = $bindable(null),
    class: className,
    value = 0,
    max = 100,
    variant = "default",
    indeterminate = false,
    ...restProps
  }: ProgressProps = $props();

  const { root, indicator } = progressVariants({ variant });
  const percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div
  bind:this={ref}
  role="progressbar"
  aria-valuemin={0}
  aria-valuemax={max}
  aria-valuenow={indeterminate ? undefined : value}
  class={cn(root(), className)}
  {...restProps}
>
  {#if indeterminate}
    <div
      class={cn(
        indicator(),
        "w-1/3 animate-[progress-indeterminate_1.5s_ease-in-out_infinite]",
      )}
    ></div>
  {:else}
    <div class={indicator()} style="width: {percentage}%"></div>
  {/if}
</div>

<style>
  @keyframes progress-indeterminate {
    0% {
      transform: translateX(-100%);
    }
    50% {
      transform: translateX(200%);
    }
    100% {
      transform: translateX(-100%);
    }
  }
</style>
