 <script lang="ts" module>
    import { icons } from "@lucide/svelte";

    export type IconName = keyof typeof icons;
  </script>

  <script lang="ts">
    import type { IconProps } from "@lucide/svelte";

    let { iconName, ...restProps }: IconProps & { iconName: IconName } =
      $props();

    const Icon = icons[iconName];

    if (!Icon) {
      throw new Error(`Icon "${String(iconName)}" not found in Lucide icons - https://lucide.dev/icons.`);
    }
  </script>

  <Icon {...restProps} />