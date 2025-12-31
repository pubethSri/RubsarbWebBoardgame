<style>
	div {
		height: 1.5em;
		text-align: center;
		border: 1px solid balack;
		margin: 0.2em;
		padding: 0.3em;
	}
	section {
		border: 1px solid black;
		width: 10em;
		padding: 0.5em;
		height: 7.5em;
	}
</style>
<script>
	import {dndzone} from 'svelte-dnd-action';
	import {flip} from 'svelte/animate';
	const flipDurationMs = 200;
	let items = [
		{id: 3, title: 'item3'},
		{id: 4, title: 'item4'}
	];
	let maxItems = 3;
	let dropFromOthersDisabled = false;
	$: opacity = dropFromOthersDisabled? 0.5 : 1;
	
	function handleConsider(e) {
		items = e.detail.items;
		if (items.length < maxItems) {
			dropFromOthersDisabled = false;
		}
	}
	function handleFinalize(e) {
		items = e.detail.items;
		dropFromOthersDisabled = (items.length >= maxItems);
	}
</script>
<p>
	This list disables drop when it reaches {maxItems} items (as in, it won't let you drop the {maxItems + 1}th item in)
</p>
<main style={`opacity: ${opacity}`}>
	<section use:dndzone={{items, flipDurationMs, dropFromOthersDisabled}} on:consider={handleConsider} on:finalize={handleFinalize}>
		{#each items as item(item.id)}
			<div animate:flip={{duration:flipDurationMs}}>
				{item.title}	
			</div>
		{/each}
	</section>
</main>
