import { exec } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { OrderStatusEnum } from 'shippo/models/components';
import { promisify } from 'util';

import { generatePackingSlip } from './lib/pdf-generator';
import { fetchOrders } from './lib/shippo';

const execAsync = promisify(exec);

// Load environment variables (.env.local overrides .env)
dotenv.config();
dotenv.config({ override: true, path: '.env.local' });

/**
 * Generate packing slip PDFs for real orders from Shippo
 * Fetches orders from the last 24 hours and generates a PDF for each
 */
async function generateRealPDFs() {
  console.log('Generating packing slips from real Shippo orders...\n');

  // Verify API token is configured
  const apiToken = process.env.SHIPPO_API_TOKEN;
  if (!apiToken) {
    console.error('Error: SHIPPO_API_TOKEN not found in .env.local');
    console.error('Please add your production API token');
    process.exit(2);
  }

  // Calculate date range (last 24 hours by default)
  const endDate = new Date();
  const startDate = new Date();
  const hoursBack = 120; // Can be adjusted as needed
  startDate.setHours(startDate.getHours() - hoursBack);

  // Filter by order status (PAID = orders that need packing slips)
  // Set to undefined to fetch all statuses
  const statusFilter = [OrderStatusEnum.Paid];

  console.log('Fetching orders from:');
  console.log('  Start:', startDate.toISOString());
  console.log('  End:', endDate.toISOString());
  console.log('');

  try {
    // Fetch orders from Shippo
    const orders = await fetchOrders(startDate, endDate, statusFilter);

    if (orders.length === 0) {
      console.log('No orders found in the specified date range.');
      console.log(
        'Try adjusting the time window or check your Shippo account.',
      );
      process.exit(0);
    }

    console.log(`✓ Found ${orders.length} order(s)\n`);

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'output');
    const fs = await import('fs/promises');
    await fs.mkdir(outputDir, { recursive: true });

    // Generate PDF for each order
    let successCount = 0;
    let errorCount = 0;

    for (const order of orders) {
      const orderNumber = order.orderNumber || order.objectId || 'unknown';
      const sanitizedOrderNumber = orderNumber.replace(/[^a-zA-Z0-9-_]/g, '_');

      // Extract and format the order date as YYYY-MM-DD
      let datePrefix = 'unknown-date';
      if (order.placedAt) {
        const orderDate = new Date(order.placedAt);
        const year = orderDate.getFullYear();
        const month = String(orderDate.getMonth() + 1).padStart(2, '0');
        const day = String(orderDate.getDate()).padStart(2, '0');
        datePrefix = `${year}-${month}-${day}`;
      }

      const outputPath = path.join(
        outputDir,
        `packing-slip-${datePrefix}-${sanitizedOrderNumber}.pdf`,
      );

      try {
        await generatePackingSlip(order, outputPath);
        console.log(`✓ Generated: ${path.basename(outputPath)}`);
        console.log(`  Order: ${orderNumber}`);
        console.log(`  Status: ${order.orderStatus || 'UNKNOWN'}`);
        console.log(`  Items: ${order.lineItems?.length || 0}`);
        console.log(`  Ship to: ${order.toAddress?.name || 'N/A'}`);

        // Open the PDF file
        try {
          await execAsync(`open "${outputPath}"`);
          console.log(`  Opened PDF`);
        } catch {
          console.log(`  (Could not auto-open PDF)`);
        }

        console.log('');
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to generate PDF for order ${orderNumber}`);
        if (error instanceof Error) {
          console.error(`  Error: ${error.message}`);
        }
        console.log('');
        errorCount++;
      }
    }

    // Summary
    console.log('='.repeat(50));
    console.log('Summary:');
    console.log(`  Total orders: ${orders.length}`);
    console.log(`  Successfully generated: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Output directory: ${outputDir}`);
    console.log('='.repeat(50));

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('✗ Failed to generate packing slips\n');
    if (error instanceof Error) {
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

// Run the script
void generateRealPDFs();
