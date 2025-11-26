<script lang="ts">
  import { superForm, defaults, setError } from "sveltekit-superforms";
  import { zod4 } from "sveltekit-superforms/adapters";
  import { loginSchema, signupSchema } from "$lib/validation";
  import { cn } from "$lib/utils.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    FieldGroup,
    Field,
    FieldDescription,
  } from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import type { HTMLAttributes } from "svelte/elements";
  import { EyeIcon, EyeOffIcon } from "@lucide/svelte";
  import { authClient, getErrorMessage } from "$lib/auth-client";
  import * as Form from "$lib/components/ui/form";
  import { siteConfig } from "$lib/config";

  interface Props extends HTMLAttributes<HTMLFormElement> {
    mode: "login" | "signup";
  }

  let { mode, class: className, ...restProps }: Props = $props();

  const schema = mode === "login" ? loginSchema : signupSchema;
  const data = defaults(zod4(schema));

  const form = superForm(data, {
    SPA: true,
    validators: zod4(schema),
    delayMs: 500,
    timeoutMs: 5000,
    async onUpdate({ form }) {
      if (!form.valid) return;

      try {
        if (mode === "login") {
          const { error } = await authClient.signIn.email({
            email: form.data.email as string,
            password: form.data.password as string,
            callbackURL: "/dashboard",
          });
          if (error)
            setError(form, "password", getErrorMessage(error.code ?? ""));
        } else {
          const { error } = await authClient.signUp.email({
            email: form.data.email as string,
            password: form.data.password as string,
            name: (form.data as { name?: string }).name as string,
            callbackURL: "/dashboard",
          });
          if (error) {
            setError(form, "password", getErrorMessage(error.code ?? ""));
          }
        }
      } catch {
        setError(form, "password", getErrorMessage());
      }
    },
  });

  const { form: formData, enhance, delayed } = form;
  let showPassword = $state(false);

  const config = {
    login: {
      title: `Sign in to ${siteConfig.name}`,
      titleClass: "text-2xl font-semibold tracking-tight",
      submitText: "Sign in",
      linkText: "Don't have an account?",
      linkLabel: "Sign up",
      linkHref: "/register",
      description: undefined,
    },
    signup: {
      title: `Create your ${siteConfig.name} account`,
      titleClass: "text-2xl font-semibold tracking-tight",
      submitText: "Create Account",
      linkText: "Already have an account?",
      linkLabel: "Sign in",
      linkHref: "/login",
    },
  } as const;

  const c = config[mode];
</script>

{#snippet emailField()}
  <Form.Field {form} name="email">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Email</Form.Label>
        <Input
          {...props}
          type="email"
          autocomplete="email"
          bind:value={$formData.email}
        />
      {/snippet}
    </Form.Control>
    <Form.FieldErrors>
      {#snippet children({ errors, errorProps })}
        {#if errors && errors.length > 0}
          <div {...errorProps}>{errors[0]}</div>
        {/if}
      {/snippet}
    </Form.FieldErrors>
  </Form.Field>
{/snippet}

{#snippet passwordField()}
  <Form.Field {form} name="password">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Password</Form.Label>
        <InputGroup.Root>
          <InputGroup.Input
            {...props}
            type={showPassword ? "text" : "password"}
            autocomplete={mode === "signup"
              ? "new-password"
              : "current-password"}
            bind:value={$formData.password}
          />
          {#if $formData.password}
            <InputGroup.Addon
              align="inline-end"
              class="rounded-r-md animate-in fade-in"
            >
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onclick={() => (showPassword = !showPassword)}
                class="hover:bg-transparent"
              >
                {#if !showPassword}
                  <EyeIcon />
                {:else}
                  <EyeOffIcon />
                {/if}
                <span class="sr-only">Toggle password visibility</span>
                <span class="sr-only"
                  >{showPassword ? "Hide password" : "Show password"}</span
                >
              </Button>
            </InputGroup.Addon>
          {/if}
        </InputGroup.Root>
      {/snippet}
    </Form.Control>
    <Form.FieldErrors>
      {#snippet children({ errors, errorProps })}
        {#if errors && errors.length > 0}
          <div {...errorProps}>{errors[0]}</div>
        {/if}
      {/snippet}
    </Form.FieldErrors>
  </Form.Field>
{/snippet}

{#snippet nameField()}
  <Form.Field {form} name={"name" as never}>
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Full Name</Form.Label>
        <!-- prettier-ignore -->
        <Input {...props} bind:value={($formData as { name?: string }).name} />
      {/snippet}
    </Form.Control>
    <Form.FieldErrors>
      {#snippet children({ errors, errorProps })}
        {#if errors && errors.length > 0}
          <div {...errorProps}>{errors[0]}</div>
        {/if}
      {/snippet}
    </Form.FieldErrors>
  </Form.Field>
{/snippet}

<form
  method="POST"
  use:enhance
  class={cn("flex flex-col gap-6", className)}
  {...restProps}
>
  <FieldGroup>
    <div class="flex flex-col items-center gap-1 text-center">
      <h1 class={c.titleClass}>{c.title}</h1>
    </div>

    {@render emailField()}
    {#if mode === "signup"}
      {@render nameField()}
    {/if}
    {@render passwordField()}

    <Field>
      <Button type="submit" disabled={$delayed}>
        {#if $delayed}
          <Spinner />
        {/if}
        {c.submitText}
      </Button>
    </Field>
    <Field>
      <FieldDescription class="text-center">
        {c.linkText}
        <a href={c.linkHref} class="underline underline-offset-4"
          >{c.linkLabel}</a
        >
      </FieldDescription>
    </Field>
  </FieldGroup>
</form>
