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
  city: 'REDACTED_CITY',
  name: 'REDACTED_COMPANY',
  state: 'WA',
  street: 'REDACTED_STREET',
  zip: 'REDACTED_ZIP',
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

      // Pipe to output file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Set default font size for entire document
      doc.fontSize(8);

      // Track vertical position
      let y = MARGIN;

      // Render header section
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      y = renderHeader(doc, order, y);
      // TODO: y will be used when implementing items table in Issue #4

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
    .font('Helvetica-Bold')
    .text(
      `Packing Slip for Order ${order.orderNumber || order.objectId || 'N/A'}`,
      MARGIN,
      y,
      {
        align: 'center',
        width: PAGE_WIDTH - 2 * MARGIN,
      },
    );
  y += LINE_HEIGHT + SECTION_SPACING;

  // Logo and From Address section - centered horizontally
  const logoPath = path.join(process.cwd(), 'src/assets/bork_logo_bw.png');
  const spacing = SECTION_SPACING / 2;

  // Measure actual text widths to calculate proper centering
  doc.font('Helvetica-Bold');
  const nameWidth = doc.widthOfString(BUSINESS_INFO.name);

  doc.font('Helvetica');
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
  doc.font('Helvetica-Bold').text(BUSINESS_INFO.name, fromX, y);
  y += SECTION_LINE_HEIGHT;

  doc
    .font('Helvetica')
    .text(BUSINESS_INFO.street, fromX, y)
    .text(cityStateZip, fromX, (y += SECTION_LINE_HEIGHT));

  // Move past the logo section
  y = Math.max(y + LINE_HEIGHT, MARGIN + LOGO_HEIGHT + SECTION_SPACING);
  y += SECTION_SPACING; // Add vertical space before Ship To section

  // Ship To Address and Order Details on the same row
  const startY = y;
  const midPoint = PAGE_WIDTH / 2;

  // Ship To Address (left side)
  doc.font('Helvetica-Bold').text('Ship To:', MARGIN, y);
  y += LINE_HEIGHT;

  const address = order.toAddress;
  doc.font('Helvetica').text(address.name || 'N/A', MARGIN, y);
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
  doc.font('Helvetica-Bold');
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
  doc.font('Helvetica-Bold').text('Order ID:', midPoint, orderDetailsY, {
    align: 'right',
    width: maxLabelWidth,
  });
  doc
    .font('Helvetica')
    .text(order.objectId || 'N/A', valueColumnStart, orderDetailsY);
  orderDetailsY += LINE_HEIGHT;

  // Order Date with right-aligned label and left-aligned value
  if (order.placedAt) {
    const orderDate = new Date(order.placedAt);
    const formattedDate = orderDate.toLocaleDateString('en-US');
    doc.font('Helvetica-Bold').text('Order Date:', midPoint, orderDetailsY, {
      align: 'right',
      width: maxLabelWidth,
    });
    doc.font('Helvetica').text(formattedDate, valueColumnStart, orderDetailsY);
    orderDetailsY += LINE_HEIGHT;
  }

  // Total Items with right-aligned label and left-aligned placeholder
  doc.font('Helvetica-Bold').text('Total Items:', midPoint, orderDetailsY, {
    align: 'right',
    width: maxLabelWidth,
  });
  doc.font('Helvetica').text('X', valueColumnStart, orderDetailsY);
  orderDetailsY += LINE_HEIGHT;

  // Move y past whichever section is taller
  y = Math.max(shipToEndY, orderDetailsY) + SECTION_SPACING;

  return y;
}
