// Example of calling decodeJPEG with parsed JPEG data
const jpegBytes = new Uint8Array(
	await fetch('path/to/your/file.jpg').then((res) => res.arrayBuffer())
);

// Parse JPEG header to get all the necessary components
const jpegHeader = parseJPEGHeader(jpegBytes);

// Now, call decodeJPEG with raw data and the Huffman tables
const decodedImage = decodeJPEG(jpegBytes, jpegHeader.huffmanTablesDC, jpegHeader.huffmanTablesAC, {
	width: jpegHeader.width,
	height: jpegHeader.height
});

// decodedImage will have the pixels in RGBA format
