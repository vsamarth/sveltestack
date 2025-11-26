<script lang="ts" module>
  import { cn } from "$lib/utils.js";
  import { type VariantProps, tv } from "tailwind-variants";
  import type { HTMLAttributes } from "svelte/elements";
  import type { WithElementRef } from "$lib/utils.js";

  export const badgeVariants = tv({
    base: "inline-flex select-none items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  });

  export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];
  export type BadgeProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    variant?: BadgeVariant;
  };
</script>

<script lang="ts">
  let {
    ref = $bindable(null),
    class: className,
    variant = "default",
    children,
    ...restProps
  }: BadgeProps = $props();
</script>

<div
  bind:this={ref}
  class={cn(badgeVariants({ variant }), className)}
  {...restProps}
>
  {@render children?.()}
</div>
