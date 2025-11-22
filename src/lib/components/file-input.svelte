<script lang="ts">
  import { useFileInput } from "@uppy/svelte";
  import { Input } from "./ui/input";
  import { Button } from "./ui/button";

  const { getButtonProps, getInputProps } = useFileInput({
    multiple: true,
  });
</script>

<Input {...getInputProps()} class="sr-only" />
<Button {...getButtonProps()} variant="outline" size="sm">Upload files</Button>
