<script lang="ts">
  import { superForm } from "sveltekit-superforms";
  import { zod4 } from "sveltekit-superforms/adapters";
  import { loginSchema } from "$lib/validation";
  import {
    FieldGroup,
    Field,
    FieldLabel,
    FieldDescription,
    FieldSeparator,
    FieldError,
  } from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { cn } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";
  import type { SuperValidated } from "sveltekit-superforms";
  import { z } from "zod";

  let {
    form,
    class: className,
    ...restProps
  }: HTMLAttributes<HTMLFormElement> & {
    form: SuperValidated<z.infer<typeof loginSchema>>;
  } = $props();

  const {
    form: formData,
    enhance,
    submitting,
    errors,
  } = superForm(form, {
    validators: zod4(loginSchema),
  });
</script>

<form
  method="POST"
  action="?/default"
  use:enhance
  class={cn("flex flex-col gap-6", className)}
  {...restProps}
>
  <FieldGroup>
    <div class="flex flex-col items-center gap-1 text-center">
      <h1 class="text-2xl font-bold">Sign in to your account</h1>
    </div>
    <Field>
      <FieldLabel for="email">Email</FieldLabel>
      <Input
        id="email"
        name="email"
        type="email"
        bind:value={$formData.email}
        aria-invalid={$errors.email ? true : undefined}
      />
      {#if $errors.email}
        <FieldError errors={$errors.email} />
      {/if}
    </Field>
    <Field>
      <div class="flex items-center">
        <FieldLabel for="password">Password</FieldLabel>
        <a href="##" class="ml-auto text-sm underline-offset-4 hover:underline">
          Forgot your password?
        </a>
      </div>
      <Input
        id="password"
        name="password"
        type="password"
        bind:value={$formData.password}
        aria-invalid={$errors.password ? true : undefined}
      />
      {#if $errors.password}
        <FieldError errors={$errors.password} />
      {/if}
    </Field>
    {#if $errors._errors}
      <Field>
        <FieldError errors={$errors._errors} />
      </Field>
    {/if}
    <Field>
      <Button type="submit" disabled={$submitting}>
        {#if $submitting}
          <Spinner />
        {/if}
        Sign in
      </Button>
    </Field>
    <FieldSeparator>Or continue with</FieldSeparator>
    <Field>
      <Button variant="outline" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path
            d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
            fill="currentColor"
          />
        </svg>
        Sign in with GitHub
      </Button>
      <FieldDescription class="text-center">
        Don't have an account?
        <a href="/register" class="underline underline-offset-4">Sign up</a>
      </FieldDescription>
    </Field>
  </FieldGroup>
</form>
