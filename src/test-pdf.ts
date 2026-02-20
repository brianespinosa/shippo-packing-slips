import path from 'node:path';
import type { Order } from 'shippo/models/components';

import { generatePackingSlip } from './lib/pdf-generator';

/**
 * Test script to generate a sample packing slip PDF
 * Tests the header section and items table implementation
 */
async function testPDFGeneration() {
  console.log('Testing PDF generation...\n');

  // Create sample order data matching Shippo Order structure
  const sampleOrder: Order = {
    lineItems: [
      {
        objectId: 'item_1',
        quantity: 2,
        title:
          'Premium Adjustable Wrench Set with Ergonomic Grip - Professional Grade Tool Kit',
        variantTitle: 'Size: Large',
      },
      {
        objectId: 'item_2',
        quantity: 1,
        title: 'Hammer',
        variantTitle: '16oz',
      },
      {
        objectId: 'item_3',
        quantity: 5,
        title: 'Screwdriver Set',
      },
      {
        objectId: 'item_4',
        quantity: 1,
        title:
          'Ultra High Performance Industrial Grade Socket Set with Ratcheting Mechanism and Quick Release Feature',
        variantTitle: 'Metric - 42 Pieces',
      },
      {
        objectId: 'item_5',
        quantity: 3,
        title: 'Pliers Set',
        variantTitle: 'Needle Nose and Slip Joint',
      },
      {
        objectId: 'item_6',
        quantity: 1,
        title: 'Tape Measure',
        variantTitle: '25ft',
      },
      {
        objectId: 'item_7',
        quantity: 2,
        title: 'Level',
        variantTitle: '24 inch',
      },
      {
        objectId: 'item_8',
        quantity: 4,
        title: 'Utility Knife with Retractable Blade',
      },
      {
        objectId: 'item_9',
        quantity: 1,
        title: 'Cordless Drill Driver Kit with Battery and Charger',
        variantTitle: '20V Max',
      },
      {
        objectId: 'item_10',
        quantity: 6,
        title: 'Hex Key Set',
        variantTitle: 'Metric and SAE',
      },
      {
        objectId: 'item_11',
        quantity: 2,
        title: 'Wire Strippers',
      },
      {
        objectId: 'item_12',
        quantity: 1,
        title: 'Tool Belt with Multiple Pockets and Pouches',
      },
    ],
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
