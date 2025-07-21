<script lang="ts">
	import { lookupVR, getElementKeyword } from '$lib/dicom/DICOMDictionary.js';

	function formatValue(value: any, tag: string): string {
		const vr = lookupVR(tag);

		if (value == null) return '';
		if (value instanceof Uint8Array) {
			if (vr === 'OB' || vr === 'OW' || vr === 'UN') {
				const hex = [...value.slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join(' ');
				return `<binary ${value.length} bytes: ${hex} ...>`;
			}
			return `<uint8array ${value.length}>`;
		}
		if (Array.isArray(value)) {
			return value.map((v) => formatValue(v, tag)).join(', ');
		}
		if (typeof value === 'string') {
			// Handle special VR cases
			if (vr === 'PN') return value.replace(/\^/g, ' ');
			if (vr === 'DA') return value.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
			if (vr === 'TM') return value.replace(/^(\d{2})(\d{2})(\d{2})$/, '$1:$2:$3');
			if (/[\x00-\x08\x0E-\x1F]/.test(value)) return `<non-printable string>`;
			return value;
		}
		return String(value);
	}

	let { elements }: { elements: any[] } = $props();
</script>

<div class="metadata-panel">
	<h3>DICOM Metadata</h3>
	<table>
		<thead>
			<tr><th>Name</th><th>Value</th></tr>
		</thead>
		<tbody>
			{#each elements as el, i (el.tag + '-' + i)}
				<tr>
					<td>{getElementKeyword(el.tag)}</td>
					<td>{formatValue(el.value, el.tag)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.metadata-panel {
		min-width: 320px;
		width: 100%;
		background: var(--color-surface);
		color: var(--color-text);
		overflow-y: scroll;
		padding: 1rem;
		font-family: monospace;
		border-left: 1px solid var(--color-border);
	}
	.metadata-panel table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	.metadata-panel th,
	.metadata-panel td {
		border: 1px solid var(--color-border);
		padding: 4px 6px;
		text-align: left;
	}
	.metadata-panel th {
		background: var(--color-header);
		font-weight: bold;
	}
</style>
