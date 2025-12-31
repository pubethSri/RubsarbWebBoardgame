<style>
	div {
		height: 1.5em;
		text-align: center;
		border: 1px solid black;
		margin: 0.2em;
		padding: 0.3em;
	}
	section {
		border: 1px solid black;
		width: 10em;
		padding: 0.5em;
		height: 7.5em;
		margin-bottom: 0.4em;
	}
	button {
		margin-bottom: 3em;
	}
</style>
<script>
	import {dndzone} from 'svelte-dnd-action';
	import {flip} from 'svelte/animate';
	const flipDurationMs = 200;
	let items = [
		{id: 1, title: 'item1'},
		{id: 2, title: 'item2'}
	];
	let dragDisabled = false;
	
	function handleSort(e) {
		items = e.detail.items;
	}
	function toggleDragEnabled(){
		dragDisabled = !dragDisabled;
	}
</script>

<p>Click the button below the list to toggle the ability to drag items away from this list</p>
<section use:dndzone={{items, flipDurationMs, dragDisabled}} on:consider={handleSort} on:finalize={handleSort}>
	{#each items as item(item.id)}
	<div animate:flip={{duration:flipDurationMs}}>
		{item.title}	
	</div>
	{/each}
</section>
<button on:click={toggleDragEnabled}>{dragDisabled? 'Enable drag': 'Disable drag'}</button>
