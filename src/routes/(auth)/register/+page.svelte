<script lang="ts">
  import SignupForm from "$lib/components/signup-form.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<SignupForm form={data.form} />
