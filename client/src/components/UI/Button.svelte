<script lang="ts">
    import { type Snippet } from "svelte";

    type Props = {
        children: Snippet;
        variant?: "primary" | "secondary" | "accent" | "outline" | "ghost";
        size?: "sm" | "md" | "lg";
        fullWidth?: boolean;
        disabled?: boolean;
        onclick?: () => void;
        class?: string;
    };

    let {
        children,
        variant = "primary",
        size = "md",
        fullWidth = false,
        disabled = false,
        onclick,
        class: className = "",
    }: Props = $props();

    const baseStyles =
        "font-mono font-bold uppercase transition-all duration-100 ease-out border-black flex items-center justify-center cursor-pointer select-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

    const variants = {
        primary:
            "bg-primary-red text-white border-4 shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-1 hover:translate-x-1 hover:shadow-[6px_6px_0px_0px_#000000]",
        secondary:
            "bg-primary-blue text-white border-4 shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-1 hover:translate-x-1 hover:shadow-[6px_6px_0px_0px_#000000]",
        accent: "bg-primary-yellow text-black border-4 shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-1 hover:translate-x-1 hover:shadow-[6px_6px_0px_0px_#000000]",
        outline:
            "bg-white text-black border-2 shadow-[4px_4px_0px_0px_#000000] hover:bg-gray-50",
        ghost: "bg-transparent border-2 border-transparent hover:border-black hover:bg-gray-100 shadow-none active:shadow-none active:translate-y-0 active:translate-x-0",
    };

    const sizes = {
        sm: "px-3 py-1 text-sm",
        md: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-xl",
    };

    let width = $derived(fullWidth ? "w-full" : "w-auto");
    let disabledStyles = $derived(
        disabled
            ? "opacity-50 cursor-not-allowed active:translate-x-0 active:translate-y-0 active:shadow-[4px_4px_0px_0px_#000000]"
            : "",
    );
</script>

<button
    class="{baseStyles} {variants[variant]} {sizes[
        size
    ]} {width} {disabledStyles} {className}"
    {disabled}
    {onclick}
>
    {@render children()}
</button>
