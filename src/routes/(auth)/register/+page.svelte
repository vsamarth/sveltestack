<script lang="ts">
  import AuthForm from "$lib/components/auth-form.svelte";
  import { siteConfig } from "$lib/config";
</script>

<svelte:head>
  <title>Sign Up | {siteConfig.name}</title>
  <meta name="description" content="Create a new {siteConfig.name} account to start securely managing your files and workspaces." />
</svelte:head>

<AuthForm mode="signup" />
