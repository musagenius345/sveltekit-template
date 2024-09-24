<script lang="ts">
    import { superForm } from 'sveltekit-superforms/client';
    import type { PageData } from './$types';

    const { data } = $props<{ data: PageData }>();

    const { form, errors, enhance } = superForm(data.form);

    const formError = $derived($form.error);
</script>

<form method="POST" use:enhance>
    <div>
        <label for="email">Email</label>
        <input id="email" name="email" type="email" bind:value={$form.email} required />
        {#if $errors.email}<span class="error">{$errors.email}</span>{/if}
    </div>
    <div>
        <label for="password">Password</label>
        <input id="password" name="password" type="password" bind:value={$form.password} required />
        {#if $errors.password}<span class="error">{$errors.password}</span>{/if}
    </div>
    {#if formError}<p class="error">{formError}</p>{/if}
    <button type="submit">Sign In</button>
</form>