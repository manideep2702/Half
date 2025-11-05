export type PdfColumn = { key: string; label: string; w: number; align?: "left" | "right" | "center" };

// Create a clean, readable table-style PDF with:
// - Proper spacing for title/meta/header
// - Auto-scaling columns to page width
// - Centered header labels and subtle grid lines
export async function createTablePDF(
  title: string,
  subtitle: string | undefined,
  columns: PdfColumn[],
  rows: any[],
  filename: string
) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  let curPage = pdf.addPage();
  let { width, height } = curPage.getSize();

  // Layout constants
  const margin = 36; // 0.5 inch
  const titleSize = 20;
  const metaSize = 10;
  const headerSize = 11;
  const cellSize = 10;
  const rowHeight = 20;
  const headerHeight = 24;

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // If columns exceed available width, proportionally scale them
  const availableWidth = width - margin * 2;
  const requestedWidth = columns.reduce((s, c) => s + c.w, 0);
  let scaledCols = columns.map((c) => ({ ...c }));
  if (requestedWidth > availableWidth) {
    const scale = availableWidth / requestedWidth;
    scaledCols = columns.map((c) => ({ ...c, w: Math.max(40, Math.floor(c.w * scale)) }));
  }

  function fit(text: unknown, w: number, f = font, size = cellSize) {
    const s = (text ?? "").toString();
    const ell = "…";
    if (f.widthOfTextAtSize(s, size) <= w - 8) return s;
    let lo = 0, hi = s.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      const part = s.slice(0, mid) + ell;
      if (f.widthOfTextAtSize(part, size) <= w - 8) lo = mid; else hi = mid - 1;
    }
    return s.slice(0, lo) + ell;
  }

  function drawHeader(p: typeof curPage, startY: number) {
    const fullTitle = subtitle ? `${title} — ${subtitle}` : title;
    // Title
    p.drawText(fullTitle, { x: margin, y: startY - titleSize, size: titleSize, font: fontBold, color: rgb(0, 0, 0) });
    let y = startY - titleSize - 6;
    // Meta line
    const exported = `Exported: ${new Date().toLocaleString()}  |  Total: ${rows.length}`;
    p.drawText(exported, { x: margin, y: y - metaSize, size: metaSize, font, color: rgb(0.25, 0.25, 0.25) });
    y -= metaSize + 10; // spacing before table header

    // Table header bar
    const totalColWidth = scaledCols.reduce((s, c) => s + c.w, 0);
    const barY = y - headerHeight; // bottom of the header bar
    p.drawRectangle({ x: margin, y: barY, width: totalColWidth, height: headerHeight, color: rgb(0.20, 0.20, 0.20) });

    // Column titles (vertically centered within header bar)
    let x = margin;
    const labelY = barY + (headerHeight - headerSize) / 2 + 2; // baseline tweak
    for (const c of scaledCols) {
      const w = c.w;
      let drawX = x + 6;
      if (c.align === "center") {
        const tW = fontBold.widthOfTextAtSize(c.label, headerSize);
        drawX = x + (w - tW) / 2;
      } else if (c.align === "right") {
        const tW = fontBold.widthOfTextAtSize(c.label, headerSize);
        drawX = x + w - tW - 6;
      }
      p.drawText(c.label, { x: drawX, y: labelY, size: headerSize, font: fontBold, color: rgb(1, 1, 1) });
      // Column separators
      p.drawLine({ start: { x, y: barY }, end: { x, y: barY + headerHeight }, thickness: 0.3, color: rgb(0, 0, 0) });
      x += w;
    }
    // Rightmost border + bottom line of header bar
    p.drawLine({ start: { x, y: barY }, end: { x, y: barY + headerHeight }, thickness: 0.3, color: rgb(0, 0, 0) });
    p.drawLine({ start: { x: margin, y: barY }, end: { x, y: barY }, thickness: 0.6, color: rgb(0, 0, 0) });

    // Return y position for first row baseline
    return barY - 8;
  }

  let y = drawHeader(curPage, height - margin);
  for (const r of rows) {
    if (y < margin + rowHeight) {
      const np = pdf.addPage([width, height]);
      // Reset size in case (e.g., different renderer or orientation later)
      ({ width, height } = np.getSize());
      y = drawHeader(np, height - margin);
      curPage = np;
    }

    let x = margin;
    for (const c of scaledCols) {
      const w = c.w;
      const content = fit((r as any)[c.key], w, font, cellSize);
      let drawX = x + 6;
      if (c.align === "center") {
        const tW = font.widthOfTextAtSize(content, cellSize);
        drawX = x + (w - tW) / 2;
      } else if (c.align === "right") {
        const tW = font.widthOfTextAtSize(content, cellSize);
        drawX = x + w - tW - 6;
      }
      curPage.drawText(content, { x: drawX, y, size: cellSize, font, color: rgb(0, 0, 0) });
      // vertical separator per row
      curPage.drawLine({ start: { x, y: y - 6 }, end: { x, y: y + 14 }, thickness: 0.2, color: rgb(0.85, 0.85, 0.85) });
      x += w;
    }
    // rightmost vertical line
    curPage.drawLine({ start: { x, y: y - 6 }, end: { x, y: y + 14 }, thickness: 0.2, color: rgb(0.85, 0.85, 0.85) });
    // Row separator
    curPage.drawLine({ start: { x: margin, y: y - 6 }, end: { x, y: y - 6 }, thickness: 0.3, color: rgb(0.75, 0.75, 0.75) });
    y -= rowHeight;
  }

  // Export
  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

