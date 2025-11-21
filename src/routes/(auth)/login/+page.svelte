<script lang="ts">
  import LoginForm from "$lib/components/login-form.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<LoginForm form={data.form} />
