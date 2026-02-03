import type PDFKit from 'pdfkit';
import type { Order } from 'shippo/models/components';

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

/**
 * Page dimensions for 4x6 inch label
 * 1 inch = 72 points in PDFKit
 */
const PAGE_WIDTH = 4 * 72; // 288 points
const PAGE_HEIGHT = 6 * 72; // 432 points

/**
 * Layout margins and spacing
 */
const MARGIN = 10;
const LOGO_WIDTH = 36;
const LOGO_HEIGHT = 36;
const LINE_HEIGHT = 14;
const SECTION_LINE_HEIGHT = LINE_HEIGHT * 0.8;
const SECTION_SPACING = 16;

/**
 * Business information for "From" address
 * TODO: Move to configuration file
 */
const BUSINESS_INFO = {
  city: 'Tacoma',
  name: 'Bork Tools',
  state: 'WA',
  street: '514 S Cushman Ave',
  zip: '98405',
};

/**
 * Generate a packing slip PDF for a given order
 * @param order - Order object from Shippo API
 * @param outputPath - Path where the PDF should be saved
 */
export async function generatePackingSlip(
  order: Order,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document with 4x6 dimensions
      const doc = new PDFDocument({
        margin: MARGIN,
        size: [PAGE_WIDTH, PAGE_HEIGHT],
      });

      // Register Inter fonts
      const fontsDir = path.join(
        process.cwd(),
        'src/assets/fonts/inter/extras/ttf',
      );
      doc.registerFont('Inter', path.join(fontsDir, 'Inter-Regular.ttf'));
      doc.registerFont('Inter-Bold', path.join(fontsDir, 'Inter-Bold.ttf'));

      // Pipe to output file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Set default font and size for entire document
      doc.font('Inter').fontSize(8);

      // Track vertical position
      let y = MARGIN;

      // Render header section
      y = renderHeader(doc, order, y);

      // Render items table
      renderItemsTable(doc, order, y);

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (error) => {
        reject(
          error instanceof Error
            ? error
            : new Error('Failed to write PDF file'),
        );
      });
    } catch (error) {
      reject(
        error instanceof Error ? error : new Error('Failed to generate PDF'),
      );
    }
  });
}

/**
 * Render the header section of the packing slip
 * @param doc - PDFKit document instance
 * @param order - Order object from Shippo API
 * @param y - Current vertical position
 * @returns New vertical position after rendering
 */
function renderHeader(
  doc: PDFKit.PDFDocument,
  order: Order,
  y: number,
): number {
  // Title
  doc
    .font('Inter-Bold')
    .text(
      `Packing Slip for Order ${order.orderNumber || order.objectId || 'N/A'}`,
      MARGIN,
      y,
      {
        align: 'center',
        width: PAGE_WIDTH - 2 * MARGIN,
      },
    );
  y += LINE_HEIGHT + 6; // Add extra spacing after title to match top margin

  // Draw a thin line under title (full width)
  doc.lineWidth(0.5).moveTo(0, y).lineTo(PAGE_WIDTH, y).stroke();
  y += SECTION_SPACING / 2;

  // Logo and From Address section - centered horizontally
  const logoPath = path.join(process.cwd(), 'src/assets/bork_logo_bw.png');
  const spacing = SECTION_SPACING / 2;

  // Measure actual text widths to calculate proper centering
  doc.font('Inter-Bold');
  const nameWidth = doc.widthOfString(BUSINESS_INFO.name);

  doc.font('Inter');
  const streetWidth = doc.widthOfString(BUSINESS_INFO.street);
  const cityStateZip = `${BUSINESS_INFO.city}, ${BUSINESS_INFO.state} ${BUSINESS_INFO.zip}`;
  const cityWidth = doc.widthOfString(cityStateZip);

  // Find the widest text line
  const maxTextWidth = Math.max(nameWidth, streetWidth, cityWidth);

  // Calculate total width and center it
  const totalWidth = LOGO_WIDTH + spacing + maxTextWidth;
  const startX = (PAGE_WIDTH - totalWidth) / 2;

  if (fs.existsSync(logoPath)) {
    // Place logo centered
    doc.image(logoPath, startX, y, {
      height: LOGO_HEIGHT,
      width: LOGO_WIDTH,
    });
  }

  y += SECTION_LINE_HEIGHT * 0.25; // Slightly lower the text relative to logo

  // From Address (to the right of logo)
  const fromX = startX + LOGO_WIDTH + spacing;
  doc.font('Inter-Bold').text(BUSINESS_INFO.name, fromX, y);
  y += SECTION_LINE_HEIGHT;

  doc
    .font('Inter')
    .text(BUSINESS_INFO.street, fromX, y)
    .text(cityStateZip, fromX, (y += SECTION_LINE_HEIGHT));

  // Move past the logo section
  y = Math.max(y + LINE_HEIGHT, MARGIN + LOGO_HEIGHT + SECTION_SPACING);
  y += SECTION_SPACING / 2; // Add vertical space before Ship To section

  // Ship To Address and Order Details on the same row
  const startY = y;
  const midPoint = PAGE_WIDTH / 2;

  // Ship To Address (left side)
  doc.font('Inter-Bold').text('Ship To:', MARGIN, y);
  y += LINE_HEIGHT;

  const address = order.toAddress;
  doc.font('Inter').text(address.name || 'N/A', MARGIN, y);
  y += SECTION_LINE_HEIGHT;

  if (address.company) {
    doc.text(address.company, MARGIN, y);
    y += SECTION_LINE_HEIGHT;
  }

  doc.text(address.street1 || '', MARGIN, y);
  y += SECTION_LINE_HEIGHT;

  if (address.street2) {
    doc.text(address.street2, MARGIN, y);
    y += SECTION_LINE_HEIGHT;
  }

  doc.text(
    `${address.city || ''}, ${address.state || ''} ${address.zip || ''}`,
    MARGIN,
    y,
  );
  y += SECTION_LINE_HEIGHT;

  doc.text(address.country || '', MARGIN, y);
  const shipToEndY = y + LINE_HEIGHT;

  // Order Details (right side, starting at same y as Ship To)
  // Two-column layout: labels right-aligned, values left-aligned
  let orderDetailsY = startY;

  // Measure label widths to determine column positions
  doc.font('Inter-Bold');
  const orderIdLabelWidth = doc.widthOfString('Order ID:');
  const orderDateLabelWidth = doc.widthOfString('Order Date:');
  const totalItemsLabelWidth = doc.widthOfString('Total Items:');
  const maxLabelWidth = Math.max(
    orderIdLabelWidth,
    orderDateLabelWidth,
    totalItemsLabelWidth,
  );

  // Column positions
  const labelColumnEnd = midPoint + maxLabelWidth;
  const valueColumnStart = labelColumnEnd + 4; // Small gap between columns

  // Order ID with right-aligned label and left-aligned value
  doc.font('Inter-Bold').text('Order ID:', midPoint, orderDetailsY, {
    align: 'right',
    width: maxLabelWidth,
  });
  doc
    .font('Inter')
    .text(order.objectId || 'N/A', valueColumnStart, orderDetailsY);
  orderDetailsY += LINE_HEIGHT;

  // Order Date with right-aligned label and left-aligned value
  if (order.placedAt) {
    const orderDate = new Date(order.placedAt);
    const formattedDate = orderDate.toLocaleDateString('en-US');
    doc.font('Inter-Bold').text('Order Date:', midPoint, orderDetailsY, {
      align: 'right',
      width: maxLabelWidth,
    });
    doc.font('Inter').text(formattedDate, valueColumnStart, orderDetailsY);
    orderDetailsY += LINE_HEIGHT;
  }

  // Total Items with right-aligned label and left-aligned value
  const totalItems = order.lineItems?.length || 0;
  doc.font('Inter-Bold').text('Total Items:', midPoint, orderDetailsY, {
    align: 'right',
    width: maxLabelWidth,
  });
  doc
    .font('Inter')
    .text(totalItems.toString(), valueColumnStart, orderDetailsY);
  orderDetailsY += LINE_HEIGHT;

  // Move y past whichever section is taller
  y = Math.max(shipToEndY, orderDetailsY) + SECTION_SPACING;

  return y;
}

/**
 * Render the items table section of the packing slip
 * @param doc - PDFKit document instance
 * @param order - Order object from Shippo API
 * @param y - Current vertical position
 * @returns New vertical position after rendering
 */
function renderItemsTable(
  doc: PDFKit.PDFDocument,
  order: Order,
  y: number,
): number {
  const lineItems = order.lineItems || [];

  if (lineItems.length === 0) {
    return y;
  }

  // Table column positions
  const itemsColumnX = MARGIN;
  const qtyColumnX = PAGE_WIDTH - MARGIN - 30; // Reserve space for qty
  const itemsColumnWidth = qtyColumnX - itemsColumnX - 10; // Gap between columns

  // Table headers
  doc
    .font('Inter-Bold')
    .text('ITEMS', itemsColumnX, y)
    .text('QTY', qtyColumnX, y, {
      align: 'right',
      width: 30,
    });
  y += LINE_HEIGHT;

  // Draw a thick line under headers (full width)
  doc.lineWidth(2).moveTo(0, y).lineTo(PAGE_WIDTH, y).stroke();

  // Helper function to render table headers
  const renderTableHeaders = (startY: number): number => {
    let headerY = startY;
    doc
      .font('Inter-Bold')
      .text('ITEMS', itemsColumnX, headerY)
      .text('QTY', qtyColumnX, headerY, {
        align: 'right',
        width: 30,
      });
    headerY += LINE_HEIGHT;

    // Draw a thick line under headers (full width)
    doc.lineWidth(2).moveTo(0, headerY).lineTo(PAGE_WIDTH, headerY).stroke();

    // Reset to regular font for line items
    doc.font('Inter');

    return headerY;
  };

  // Render each line item
  doc.font('Inter');
  const rowPadding = 6; // Equal padding top and bottom

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];

    // Measure the space needed for this item before checking page break
    const title = item.title || 'Unknown Item';
    // Use single line height for truncated text
    const singleLineHeight = doc.currentLineHeight();

    let itemHeight = rowPadding + singleLineHeight; // Top padding + title

    if (item.variantTitle) {
      itemHeight += singleLineHeight; // Variant (no gap - goes right after title)
    }

    itemHeight += rowPadding; // Bottom padding

    // Check if we need a new page based on actual item height
    const wouldFit = y + itemHeight <= PAGE_HEIGHT - MARGIN;

    if (!wouldFit) {
      doc.addPage({
        margin: MARGIN,
        size: [PAGE_WIDTH, PAGE_HEIGHT],
      });
      y = MARGIN + SECTION_SPACING; // Add section spacing at top of new page
      // Render headers on new page
      y = renderTableHeaders(y);
    }

    // Add padding at top of row
    y += rowPadding;

    const startY = y;

    doc.text(title, itemsColumnX, y, {
      ellipsis: true,
      height: singleLineHeight,
      width: itemsColumnWidth,
    });

    // Quantity (right-aligned, same row as title)
    const quantity = item.quantity || 0;
    doc.text(quantity.toString(), qtyColumnX, startY, {
      align: 'right',
      width: 30,
    });

    y = startY + singleLineHeight;

    // Variant title (if present)
    if (item.variantTitle) {
      doc.text(item.variantTitle, itemsColumnX, y, {
        ellipsis: true,
        height: singleLineHeight,
        width: itemsColumnWidth,
      });

      y += singleLineHeight;
    }

    // Add padding at bottom of row
    y += rowPadding;

    // Draw a thin line between items (except after the last item or if next item will be on new page)
    const isLastItem = i === lineItems.length - 1;
    let willNeedNewPage = false;

    if (!isLastItem) {
      // Check if next item will fit on this page
      const nextItem = lineItems[i + 1];
      let nextItemHeight = rowPadding + singleLineHeight;

      if (nextItem.variantTitle) {
        nextItemHeight += singleLineHeight;
      }

      nextItemHeight += rowPadding;

      willNeedNewPage = y + nextItemHeight > PAGE_HEIGHT - MARGIN;
    }

    if (!isLastItem && !willNeedNewPage) {
      doc
        .lineWidth(0.5)
        .moveTo(MARGIN, y)
        .lineTo(PAGE_WIDTH - MARGIN, y)
        .stroke();
    }
  }

  return y;
}
