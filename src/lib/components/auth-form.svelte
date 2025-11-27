<script lang="ts" generics="T extends z.ZodObject<any>">
  import { superForm, defaults } from "sveltekit-superforms";
  import { zod4 } from "sveltekit-superforms/adapters";
  import type { z } from "zod";
  import type { Snippet } from "svelte";
  import type { SuperForm, SuperValidated } from "sveltekit-superforms";
  import { cn } from "$lib/utils.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    FieldGroup,
    Field,
    FieldDescription,
  } from "$lib/components/ui/field/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import * as Form from "$lib/components/ui/form";
  import { EyeIcon, EyeOffIcon } from "@lucide/svelte";
  import type { HTMLAttributes, HTMLInputAttributes } from "svelte/elements";

  // Type utilities for schema-derived field configuration
  type SchemaKeys<T extends z.ZodObject<any>> = keyof z.infer<T>;
  type SchemaShape<T extends z.ZodObject<any>> = z.infer<T>;

  type BaseFieldConfig = {
    label: string;
  } & Omit<HTMLInputAttributes, "value" | "ref">;

  type FieldsConfig<T extends z.ZodObject<any>> = Partial<
    Record<SchemaKeys<T>, BaseFieldConfig & Record<string, any>>
  >;

  interface Props extends HTMLAttributes<HTMLFormElement> {
    schema: T;
    onSubmit: (form: SuperValidated<SchemaShape<T>, any>) => Promise<void>;
    title: string;
    submitText: string;
    linkText?: string;
    linkHref?: string;
    linkLabel?: string;
    description?: string;
    fields?: FieldsConfig<T>;
    titleSnippet?: Snippet;
    footerSnippet?: Snippet<
      [{ linkText?: string; linkHref?: string; linkLabel?: string }]
    >;
  }

  let {
    schema,
    onSubmit,
    title: titleText,
    submitText,
    linkText,
    linkHref,
    linkLabel,
    description,
    fields: fieldsConfig = {},
    titleSnippet,
    footerSnippet,
    class: className,
    ...restProps
  }: Props = $props();

  let showPassword = $state(false);

  const data = defaults(zod4(schema));

  const form = superForm(data, {
    SPA: true,
    validators: zod4(schema),
    delayMs: 500,
    timeoutMs: 5000,
    applyAction: false,
    invalidateAll: false,
    async onUpdate({ form: validatedForm }) {
      if (!validatedForm.valid) return;
      await onSubmit(validatedForm as SuperValidated<SchemaShape<T>, any>);
    },
  });

  const { form: formData, enhance, delayed } = form;
</script>

{#snippet standardField(
  fieldName: string,
  fieldConfig: BaseFieldConfig & Record<string, any>,
)}
  {@const {
    label,
    type,
    showForgotPassword: _,
    files: __,
    ...inputProps
  } = fieldConfig}
  {@const autocomplete =
    type === "email"
      ? (inputProps.autocomplete ?? "email")
      : inputProps.autocomplete}
  <Form.Field {form} name={fieldName as never}>
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>{label}</Form.Label>
        <!-- prettier-ignore -->
        <Input
          {...props}
          {...inputProps}
          type={type as any}
          {autocomplete}
          bind:value={($formData as any)[fieldName]}
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

{#snippet passwordField(
  fieldName: string,
  fieldConfig: BaseFieldConfig & Record<string, any>,
)}
  {@const {
    label,
    type,
    showForgotPassword,
    files: _,
    ...inputProps
  } = fieldConfig}
  <Form.Field {form} name={fieldName as never}>
    <Form.Control>
      {#snippet children({ props })}
        <div class="flex items-center justify-between">
          <Form.Label>{label}</Form.Label>
          {#if showForgotPassword}
            <a
              href="/forgot-password"
              class="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </a>
          {/if}
        </div>
        <InputGroup.Root>
          <!-- prettier-ignore -->
          <InputGroup.Input
            {...props}
            {...inputProps}
            type={(showPassword ? "text" : type) as any}
            autocomplete={inputProps.autocomplete ?? "current-password"}
            bind:value={($formData as any)[fieldName]}
          />
          {#if ($formData as any)[fieldName]}
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

<form
  method="POST"
  use:enhance
  class={cn("flex flex-col gap-6", className)}
  {...restProps}
>
  <FieldGroup>
    {#if titleSnippet}
      {@render titleSnippet()}
    {:else}
      <div class="flex flex-col items-center gap-1 text-center">
        <h1 class="text-2xl font-semibold tracking-tight">{titleText}</h1>
        {#if description}
          <p class="text-sm text-muted-foreground">{description}</p>
        {/if}
      </div>
    {/if}

    {#each Object.entries(fieldsConfig) as [fieldName, fieldConfig]}
      {#if fieldConfig}
        {@const fieldType = fieldConfig.type?.toLowerCase()}
        {#if fieldType === "password"}
          {@render passwordField(fieldName, fieldConfig)}
        {:else}
          {@render standardField(fieldName, fieldConfig)}
        {/if}
      {/if}
    {/each}

    <Field>
      <Button type="submit" disabled={$delayed}>
        {#if $delayed}
          <Spinner />
        {/if}
        {submitText}
      </Button>
    </Field>

    {#if footerSnippet}
      {@render footerSnippet({ linkText, linkHref, linkLabel })}
    {:else if linkText && linkHref && linkLabel}
      <Field>
        <FieldDescription class="text-center">
          {linkText}
          <a href={linkHref} class="underline underline-offset-4">{linkLabel}</a
          >
        </FieldDescription>
      </Field>
    {/if}
  </FieldGroup>
</form>
