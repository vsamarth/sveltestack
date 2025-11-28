<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Form from "$lib/components/ui/form/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { superForm, defaults } from "sveltekit-superforms";
  import { zod4 } from "sveltekit-superforms/adapters";
  import { inviteSchema } from "$lib/validation";
  import { invalidateAll } from "$app/navigation";
  import { UserPlusIcon } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import { sendInvite } from "$lib/remote/actions.remote";

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    workspaceId: string;
    workspaceName: string;
  }

  let {
    open = $bindable(false),
    onOpenChange,
    workspaceId,
    workspaceName,
  }: Props = $props();

  let errorMessage = $state("");

  const data = defaults(zod4(inviteSchema));

  const form = superForm(data, {
    SPA: true,
    validators: zod4(inviteSchema),
    dataType: "json",
    resetForm: true,
    async onUpdate({ form: validatedForm }) {
      if (!validatedForm.valid) return;

      errorMessage = "";

      try {
        await sendInvite({
          workspaceId,
          email: validatedForm.data.email,
        });

        await invalidateAll();
        open = false;
        toast.success("Invitation sent", {
          description: `An invite has been sent to ${validatedForm.data.email}`,
        });
      } catch (error) {
        console.error("Failed to send invite:", error);
        if (error instanceof Error) {
          errorMessage = error.message;
        } else {
          errorMessage = "An unexpected error occurred. Please try again.";
        }
      }
    },
  });

  const { form: formData, enhance, delayed } = form;

  // Reset form and error when dialog opens
  $effect(() => {
    if (open) {
      $formData.email = "";
      errorMessage = "";
    }
  });
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Content class="sm:max-w-[480px]">
    <Dialog.Header class="space-y-3">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"
        >
          <UserPlusIcon class="h-5 w-5 text-primary" />
        </div>
        <div>
          <Dialog.Title class="text-xl">Invite Member</Dialog.Title>
          <Dialog.Description class="text-sm">
            Invite someone to collaborate on <span class="font-medium"
              >{workspaceName}</span
            >.
          </Dialog.Description>
        </div>
      </div>
    </Dialog.Header>
    <form use:enhance class="space-y-6 pt-2">
      <Form.Field {form} name="email">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label class="text-sm font-medium">Email</Form.Label>
            <Input
              {...props}
              type="email"
              placeholder="colleague@example.com"
              bind:value={$formData.email}
              autofocus
              class="h-10"
            />
            <Form.Description class="text-xs text-muted-foreground">
              They'll receive an email with a link to join this workspace.
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
        <Button
          type="button"
          variant="outline"
          onclick={() => (open = false)}
          size="sm"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={$delayed} size="sm">
          {#if $delayed}
            <Spinner class="mr-2" />
            Sending...
          {:else}
            Send Invitation
          {/if}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
