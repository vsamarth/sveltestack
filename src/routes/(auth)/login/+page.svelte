<script lang="ts">
  import AuthForm from "$lib/components/auth-form.svelte";
  import { siteConfig } from "$lib/config";
</script>

<svelte:head>
  <title>Sign In | {siteConfig.name}</title>
  <meta name="description" content="Sign in to your {siteConfig.name} account to securely access your workspaces and files." />
</svelte:head>

<AuthForm mode="login" />
