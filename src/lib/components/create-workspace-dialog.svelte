<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Form from "$lib/components/ui/form/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { superForm } from "sveltekit-superforms";
  import { zod4 } from "sveltekit-superforms/adapters";
  import { workspaceSchema } from "$lib/validation";
  import { goto, invalidateAll } from "$app/navigation";
  import { FolderPlusIcon } from "@lucide/svelte";
  import type { SuperValidated } from "sveltekit-superforms";
  import type { WorkspaceSchema } from "$lib/validation";

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    data: SuperValidated<WorkspaceSchema>;
  }

  let { open = $bindable(false), onOpenChange, data }: Props = $props();
  let errorMessage = $state("");

  const form = superForm(data, {
    SPA: true,
    validators: zod4(workspaceSchema),
    dataType: "json",
    resetForm: true,
    async onUpdate({ form }) {
      if (!form.valid) return;

      errorMessage = "";

      try {
        const response = await fetch("/api/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form.data),
        });

        if (!response.ok) {
          const error = await response.text();
          errorMessage = error || "Failed to create workspace";
          return;
        }

        const { workspace } = await response.json();
        await invalidateAll();
        open = false;
        await goto(`/dashboard/workspace/${workspace.id}`);
      } catch (error) {
        console.error("Failed to create workspace:", error);
        errorMessage = "An unexpected error occurred. Please try again.";
      }
    },
  });

  const { form: formData, enhance, delayed } = form;
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Content class="sm:max-w-[480px]">
    <Dialog.Header class="space-y-3">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"
        >
          <FolderPlusIcon class="h-5 w-5 text-primary" />
        </div>
        <div>
          <Dialog.Title class="text-xl">Create Workspace</Dialog.Title>
          <Dialog.Description class="text-sm">
            Organize your files in a dedicated space.
          </Dialog.Description>
        </div>
      </div>
    </Dialog.Header>
    <form method="POST" use:enhance class="space-y-6 pt-2">
      <Form.Field {form} name="name">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label class="text-sm font-medium">Name</Form.Label>
            <Input
              {...props}
              type="text"
              placeholder="e.g., Personal Projects, Work Files"
              bind:value={$formData.name}
              autofocus
              class="h-10"
            />
            <Form.Description class="text-xs text-muted-foreground">
              Choose a descriptive name for your workspace.
            </Form.Description>
          {/snippet}
        </Form.Control>
        <Form.FieldErrors>
          {#snippet children({ errors, errorProps })}
            {#if errors && errors.length > 0}
              <div {...errorProps} class="text-sm text-destructive">
                {errors[0]}
              </div>
            {/if}
          {/snippet}
        </Form.FieldErrors>
      </Form.Field>

      {#if errorMessage}
        <div
          class="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      {/if}

      <Dialog.Footer>
        <Button type="submit" disabled={$delayed} size="sm">
          {#if $delayed}
            <Spinner class="mr-2" />
            Creating...
          {:else}
            Create
          {/if}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
