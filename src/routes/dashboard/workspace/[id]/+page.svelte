<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Empty from "$lib/components/ui/empty";
  import { CloudIcon } from "@lucide/svelte";

  let { data } = $props();
</script>

<Empty.Root class="border border-dashed">
  <Empty.Header>
    <Empty.Media variant="icon">
      <CloudIcon />
    </Empty.Media>
    <Empty.Title>Nothing here yet</Empty.Title>
    <Empty.Description>
      Start by uploading your first file to this workspace.
    </Empty.Description>
  </Empty.Header>
  <Empty.Content>
    <Button variant="outline" size="sm">Upload Files</Button>
  </Empty.Content>
</Empty.Root>
