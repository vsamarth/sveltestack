<script lang="ts">
  import { icons, type IconProps } from "@lucide/svelte";

  export type IconName = keyof typeof icons;

  let { iconName, ...restProps }: IconProps & { iconName: IconName } = $props();

  const Icon = icons[iconName];

  if (!Icon) {
    throw new Error(
      `Icon "${String(iconName)}" not found in Lucide icons - https://lucide.dev/icons.`,
    );
  }
</script>

<Icon {...restProps} />
