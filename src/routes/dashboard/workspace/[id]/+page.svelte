<script lang="ts">
  import FileInput from "$lib/components/file-input.svelte";
  import * as Empty from "$lib/components/ui/empty";
  import { CloudIcon } from "@lucide/svelte";
  import Uppy from "@uppy/core";
  import { UppyContextProvider } from "@uppy/svelte";
  import AwsS3 from "@uppy/aws-s3";

  const uppy = new Uppy({
    autoProceed: true,
    restrictions: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxNumberOfFiles: 10,
    },
  }).use(AwsS3, {
    shouldUseMultipart: false,
    async getUploadParameters(file) {
      const response = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const data = await response.json();

      return {
        method: data.method,
        url: data.url,
        headers: data.headers,
      };
    },
  });
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
    <UppyContextProvider {uppy}>
      <FileInput />
    </UppyContextProvider>
  </Empty.Content>
</Empty.Root>
