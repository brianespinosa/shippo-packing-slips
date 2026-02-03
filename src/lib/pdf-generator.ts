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
const MARGIN = 20;
const LOGO_WIDTH = 60;
const LOGO_HEIGHT = 60;
const LINE_HEIGHT = 14;
const SECTION_SPACING = 16;

/**
 * Business information for "From" address
 * TODO: Move to configuration file
 */
const BUSINESS_INFO = {
  city: 'Your City',
  name: 'Your Business Name',
  state: 'ST',
  street: '123 Your Street',
  zip: '12345',
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
    .fontSize(16)
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
  y += LINE_HEIGHT * 2 + SECTION_SPACING;

  // Logo and From Address section
  const logoPath = path.join(__dirname, '../assets/bork_logo_bw.png');

  if (fs.existsSync(logoPath)) {
    // Place logo on the left
    doc.image(logoPath, MARGIN, y, {
      height: LOGO_HEIGHT,
      width: LOGO_WIDTH,
    });
  }

  // From Address (to the right of logo)
  const fromX = MARGIN + LOGO_WIDTH + 15;
  doc.fontSize(9).font('Helvetica-Bold').text('From:', fromX, y);
  y += LINE_HEIGHT;

  doc
    .fontSize(8)
    .font('Helvetica')
    .text(BUSINESS_INFO.name, fromX, y)
    .text(BUSINESS_INFO.street, fromX, (y += LINE_HEIGHT))
    .text(
      `${BUSINESS_INFO.city}, ${BUSINESS_INFO.state} ${BUSINESS_INFO.zip}`,
      fromX,
      (y += LINE_HEIGHT),
    );

  // Move past the logo section
  y = Math.max(y + LINE_HEIGHT, MARGIN + LOGO_HEIGHT + SECTION_SPACING);

  // Ship To Address
  doc.fontSize(9).font('Helvetica-Bold').text('Ship To:', MARGIN, y);
  y += LINE_HEIGHT;

  const address = order.toAddress;
  doc
    .fontSize(8)
    .font('Helvetica')
    .text(address.name || 'N/A', MARGIN, y);
  y += LINE_HEIGHT;

  if (address.company) {
    doc.text(address.company, MARGIN, y);
    y += LINE_HEIGHT;
  }

  doc.text(address.street1 || '', MARGIN, y);
  y += LINE_HEIGHT;

  if (address.street2) {
    doc.text(address.street2, MARGIN, y);
    y += LINE_HEIGHT;
  }

  doc.text(
    `${address.city || ''}, ${address.state || ''} ${address.zip || ''}`,
    MARGIN,
    y,
  );
  y += LINE_HEIGHT;

  doc.text(address.country || '', MARGIN, y);
  y += LINE_HEIGHT + SECTION_SPACING;

  // Order Details
  doc.fontSize(9).font('Helvetica-Bold').text('Order Details:', MARGIN, y);
  y += LINE_HEIGHT;

  doc.fontSize(8).font('Helvetica');

  // Order ID
  doc.text(`Order ID: ${order.objectId || 'N/A'}`, MARGIN, y, {
    continued: false,
  });
  y += LINE_HEIGHT;

  // Order Date
  if (order.placedAt) {
    const orderDate = new Date(order.placedAt);
    const formattedDate = orderDate.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    doc.text(`Order Date: ${formattedDate}`, MARGIN, y);
    y += LINE_HEIGHT;
  }

  y += SECTION_SPACING;

  return y;
}
