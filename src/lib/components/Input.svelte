<script lang="ts">
  interface Props {
    type?: string;
    label?: string;
    error?: string;
    required?: boolean;
    placeholder?: string;
    value?: string;
    class?: string;
    id?: string;
    name?: string;
    disabled?: boolean;
  }

  let {
    type = "text",
    label,
    error,
    required = false,
    placeholder,
    value = $bindable(),
    class: className = "",
    id,
    name,
    disabled = false,
    ...restProps
  }: Props = $props();

  const inputId =
    id || name || `input-${Math.random().toString(36).substr(2, 9)}`;
</script>

<div class="input-wrapper">
  {#if label}
    <label for={inputId} class="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {#if required}
        <span class="text-red-500">*</span>
      {/if}
    </label>
  {/if}

  <input
    {type}
    {id}
    {name}
    {placeholder}
    {required}
    {disabled}
    bind:value
    class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 {error
      ? 'border-red-500'
      : ''} {className}"
    {...restProps}
  />

  {#if error}
    <p class="mt-1 text-sm text-red-600">{error}</p>
  {/if}
</div>

<style>
  .input-wrapper {
    margin-bottom: 1rem;
  }
</style>
