# Svelte-Dicom

Svelte-Dicom evening project, based on Reddit comment. [text](https://www.reddit.com/r/sveltejs/comments/1m0mlav/comment/n3b7n8g/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button)

I like a challenge, to keep myself entertained of an evening after the 9-5... this medical tool pairs well with my research projects at The University of Newcastle... so here goes nothing,... or something. DICOM imaging tool for SvelteKit on the way.

![image](https://halide.michaelcuneo.com.au/misc/dicom-viewer-1.png)

## Installation

```bash
# install the repo. (NOT ACTUALLY LIVE YET, I WILL PUBLISH ONCE STABLE)
npm i @michaelcuneo/svelte-dicom
```

## Usage

```javascript
<script lang="ts">
  let file = $state<File | null>(null);
  let files = $state<FileList | null>(null);
  import Dicom from '@michaelcuneo/svelte-dicom';
</script>

<input
  type="file"
  accept=".dcm"
  onchange={(e) => {
    // Add file to the files list
    const target = e.target as HTMLInputElement;
    files = target.files;
    if (files) {
      file = files[0]; // Get the first file
    } else {
      file = null; // Reset if no files selected
    }
  }}
/>
<Dicom {files} />
```

## What works.

- Decode uncompressed Uin8/Uint16 DICOM to Canvas.
- Zoom in/out, Pan, Fit to Screen.

## Todo

- Decode/Encode for Uncompressed, Lossless, Lossy and RLE.
- Sync/Async Dictionary Loading.
- Fix image controls.
- Apply networking implementations for PACS
- Allow windowed array's from DICOM projects.
- Multiple DICOM's in one zip? I don't know how the PACS system does it, will research and implement window/array stuff later.

## Problems

- The parser is broken with my test file, and I am forced to give a fixed offset of 1400 to render the first test image.
