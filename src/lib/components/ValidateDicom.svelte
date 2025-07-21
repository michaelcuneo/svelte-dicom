<script lang="ts">
  import { DICOMParser } from '$lib/dicom/DICOMParser.js';
  import { isTransferSyntaxSupported } from '$lib/dicom/TransferSyntax.js';
  import { debugLog } from '$lib/dicom/debugStore.js';

  let { file }: { file: File | null } = $props();

  let transferSyntaxUID = $state('');
  let hasPixelData = $state(false);
  let bitsAllocated = $state<number | null>(null);
  let samplesPerPixel = $state<number | null>(null);
  let supported = $state(false);

  $effect(() => {
    if (file) validateFile(file);
  });

  async function validateFile(f: File) {
    const buffer = await f.arrayBuffer();
    const parser = new DICOMParser(buffer);

    const meta = parser.parseMeta();
    const transferSyntax = parser.getTransferSyntaxFromMeta(meta);
    transferSyntaxUID = transferSyntax.uid;

    parser.byteStream.seek(parser.getOffset());
    const elements = parser.parse();

    hasPixelData = elements.some(e => e.tag === '7FE0,0010');
    bitsAllocated = extractInt(elements, '0028,0100');
    samplesPerPixel = extractInt(elements, '0028,0002');

    supported =
      isTransferSyntaxSupported(transferSyntaxUID) &&
      hasPixelData &&
      bitsAllocated !== null &&
      bitsAllocated <= 8 &&
      (samplesPerPixel === 1 || samplesPerPixel === 3);

    debugLog(`Validated file ${f.name}: supported = ${supported}`, {
      level: 'info',
      category: 'validate'
    });
  }

  function extractInt(elements: { tag: string; value: any }[], tag: string): number | null {
    const raw = elements.find(e => e.tag === tag)?.value;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') return parseInt(raw);
    return null;
  }
</script>

<div class="validator-panel">
  <h3>DICOM File Validation</h3>
  {#if transferSyntaxUID}
    <p><strong>Transfer Syntax UID:</strong> {transferSyntaxUID}</p>
    <p><strong>Supported:</strong> {supported ? '✅ Yes' : '❌ No'}</p>
    <ul>
      <li>Has Pixel Data: {hasPixelData ? '✅' : '❌'}</li>
      <li>Bits Allocated: {bitsAllocated ?? '❓'}</li>
      <li>Samples Per Pixel: {samplesPerPixel ?? '❓'}</li>
    </ul>
  {/if}
</div>

<style>
  .validator-panel {
    padding: 1rem;
    background: var(--color-surface);
    color: var(--color-text);
    font-family: monospace;
    border-left: 1px solid var(--color-border);
  }

  ul {
    padding-left: 1rem;
    margin: 0;
  }

  li {
    margin-bottom: 0.25rem;
  }
</style>
