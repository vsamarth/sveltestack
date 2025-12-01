export const SAMPLE_FILES = {
  png: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8jvKQAAAAASUVORK5CYII=",
    "base64",
  ),
  jpeg: Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhISEhIWFRUVFRUVFRUVFRUVFRUWFxUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OFg8QFy0dHR0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAAAAQID/8QAFhABAQEAAAAAAAAAAAAAAAAAAAEC/9oADAMBAAIQAxAAAAGzAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/EABkQAAMAAwAAAAAAAAAAAAAAAAABAgMEBf/aAAgBAQABBQLnV5xvqcWz/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwE//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwE//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9k=",
    "base64",
  ),
  pdf: Buffer.from(
    `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 18 Tf 72 720 Td (Seeded file)
Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000061 00000 n
0000000118 00000 n
0000000215 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
300
%%EOF`,
    "utf-8",
  ),
};

export function generateFileContent(
  filename: string,
  contentType: string,
  size: number,
): Buffer {
  const safeSize = Math.max(size, 256);
  const type = contentType.toLowerCase();
  const base = type.includes("pdf")
    ? SAMPLE_FILES.pdf
    : type.includes("png")
      ? SAMPLE_FILES.png
      : type.includes("jpeg") || type.includes("jpg")
        ? SAMPLE_FILES.jpeg
        : null;

  if (base)
    return Buffer.concat([
      base,
      Buffer.alloc(Math.max(0, safeSize - base.length)),
    ]);
  if (
    type.startsWith("text/") ||
    type.includes("markdown") ||
    type.includes("plain")
  ) {
    return Buffer.from(
      `Seeded file generated for ${filename}.\n`
        .repeat(Math.ceil(safeSize / 50))
        .slice(0, safeSize),
      "utf-8",
    );
  }
  return Buffer.alloc(safeSize);
}
