import type { Order } from 'shippo/models/components';

import path from 'path';

import { generatePackingSlip } from './lib/pdf-generator';

/**
 * Test script to generate a sample packing slip PDF
 * Tests the header section implementation
 */
async function testPDFGeneration() {
  console.log('Testing PDF generation...\n');

  // Create sample order data matching Shippo Order structure
  const sampleOrder: Order = {
    objectId: 'order_123abc456def',
    orderNumber: '#1068',
    placedAt: '2026-02-02T14:30:00Z',
    toAddress: {
      city: 'San Francisco',
      country: 'US',
      name: 'John Doe',
      state: 'CA',
      street1: '123 Market Street',
      street2: 'Apt 4B',
      zip: '94103',
    },
  };

  // Generate PDF in current directory
  const outputPath = path.join(process.cwd(), 'test-packing-slip.pdf');

  try {
    await generatePackingSlip(sampleOrder, outputPath);
    console.log('✓ PDF generated successfully!');
    console.log(`  Output: ${outputPath}`);
    console.log('\nOpen the PDF to verify:');
    console.log(`  open ${outputPath}`);
  } catch (error) {
    console.error('✗ Failed to generate PDF\n');
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('\nStack trace:');
      console.error(error.stack);
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

// Run the test
void testPDFGeneration();
