<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { slide } from "svelte/transition";
    import { authStore } from "../lib/stores/auth";
    import Button from "./UI/Button.svelte";

    const dispatch = createEventDispatcher();
</script>

<div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    transition:slide
>
    <div
        class="bg-white border-4 border-black p-8 w-full max-w-sm shadow-[8px_8px_0px_0px_#000000] relative"
    >
        <div
            class="absolute -top-3 -left-3 bg-primary-blue w-full h-full -z-10 border-4 border-black transition-transform group-hover:translate-x-2 group-hover:translate-y-2"
        ></div>

        <h2
            class="text-3xl font-black font-mono uppercase mb-6 text-center border-b-4 border-black pb-4"
        >
            Login
        </h2>

        <div class="flex flex-col gap-4">
            <p class="font-mono text-sm text-center text-gray-500 mb-2">
                AUTHENTICATION REQUIRED
            </p>

            <Button
                variant="primary"
                fullWidth
                size="lg"
                onclick={() =>
                    (window.location.href = "/api/auth/login/authentik")}
                class="h-16 text-xl border-4"
            >
                LOGIN WITH AUTHENTIK
            </Button>

            <div class="text-[10px] font-mono text-center text-gray-400 mt-2">
                SECURED BY OIDC
            </div>

            <div class="border-t-2 border-black/10 my-2"></div>

            <Button
                variant="ghost"
                fullWidth
                size="sm"
                onclick={() => dispatch("close")}
            >
                CANCEL
            </Button>
        </div>
    </div>
</div>
