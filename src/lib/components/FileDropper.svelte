<script lang="ts">
	let {
		files = $bindable<FileList | null>(),
		variant = 'standard',
		label = `file-dropper-label-${Math.random().toString(36).substring(2, 15)}`
	}: {
		files?: FileList | null;
		variant?: 'standard' | 'neumorphic';
		label?: string;
	} = $props();

	let dropArea: HTMLElement | undefined = $state();
	let progressBar: HTMLElement | undefined = $state();
	let progress = $state(0);
	let highlight = $state(false);
	let filesDone = $state(0);
	let filesToDo = $state(0);
	let hidden = $derived(() => filesDone === filesToDo && filesToDo !== 0);

	const handleDragOver = (e: DragEvent) => {
		highlight = true;
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDragLeave = (e: DragEvent) => {
		highlight = false;
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		const droppedFiles = e.dataTransfer?.files;
		if (droppedFiles && droppedFiles.length > 0) {
			// Only keep the first file
			const dt = new DataTransfer();
			dt.items.add(droppedFiles[0]);
			files = dt.files;
		}
	};

	const handleFiles = (event: Event) => {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			// Only keep the first file
			const dt = new DataTransfer();
			dt.items.add(input.files[0]);
			files = dt.files;
		}
	};
</script>

<div
	bind:this={dropArea}
	role="region"
	aria-label={label}
	class={`drop-area ${variant}`}
	class:highlight
	ondragenter={handleDragOver}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	onfocus={() => (highlight = true)}
	onblur={() => (highlight = false)}
>
	<p id={label} class="drop-instructions">
		Drag and drop your DICOM file here or
		<label class="button" for="files">browse</label>.
	</p>

	<input
		type="file"
		class="files"
		id="files"
		aria-labelledby={label}
		accept=".dcm"
		onchange={handleFiles}
	/>

	{#if files && files.length > 0}
		<p class="filename">Selected file: {files[0].name}</p>
	{/if}

	{#if !hidden && progress > 0 && progress < 100}
		<progress
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={progress}
			class="progress"
			bind:this={progressBar}
			max="100"
			value={progress}
		>
			{progress}%
		</progress>
	{/if}
</div>
<style>
	.drop-area {
		display: flex;
		flex-direction: column;
		border: 2px dashed var(--color-border);
		border-radius: 20px;
		width: 100%;
		min-width: 300px;
		max-width: 800px;
		padding: 1rem;
		justify-content: center;
		align-items: center;
		font-family: system-ui, sans-serif;
		color: var(--color-text);
		background: var(--color-background);
		outline: none;
		transition: all 0.3s ease-in-out;
	}

	.drop-area:focus {
		box-shadow: 0 0 0 3px var(--color-focus);
	}

	.highlight {
		background-color: var(--color-surface);
		border-color: var(--color-accent);
	}

	.progress {
		width: 100%;
		height: 1rem;
		margin-top: 1rem;
	}

	.icon-button {
    display: flex;
		background: var(--color-danger);
		color: var(--color-background);
		border-radius: 50%;
		border: none;
		padding: 6px;
		cursor: pointer;
	}

	.icon-button:hover {
		background: var(--color-danger);
	}

	.files {
		display: none;
	}

	.button {
		text-decoration: underline;
		cursor: pointer;
		color: var(--color-accent);
	}

	.filename {
		margin: 0 1rem;
		flex-grow: 1;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

  .image-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
  }

	/* Neumorphic variant using your vars */
	.drop-area.neumorphic {
		border: none;
		background: var(--color-background);
		box-shadow:
			8px 8px 16px var(--neumorphism-shadow),
			-8px -8px 16px var(--neumorphism-highlight);
	}

	.drop-area.neumorphic.highlight {
		box-shadow:
			inset 8px 8px 16px var(--neumorphism-shadow-active),
			inset -8px -8px 16px var(--neumorphism-highlight-active);
	}

	.drop-area.neumorphic .image-container {
		background: var(--color-background);
		box-shadow:
			4px 4px 10px var(--neumorphism-shadow),
			-4px -4px 10px var(--neumorphism-highlight);
	}

	.drop-area.neumorphic .progress {
		background: var(--color-background);
		box-shadow:
			inset 4px 4px 8px var(--neumorphism-shadow),
			inset -4px -4px 8px var(--neumorphism-highlight);
		border-radius: 999px;
		overflow: hidden;
	}
</style>
