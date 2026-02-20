import { unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { OrderStatusEnum } from 'shippo/models/components';

import { generatePackingSlip } from './lib/pdf-generator';
import { printPDF } from './lib/printer';
import { fetchOrders, fetchTransactions } from './lib/shippo';

// Load environment variables (.env.local overrides .env)
dotenv.config();
dotenv.config({ override: true, path: '.env.local' });

async function runPackingSlipsJob(
  startDate: Date,
  endDate: Date,
): Promise<{ success: number; errors: number }> {
  console.log('Fetching orders and generating packing slips...');

  const statusFilter = [OrderStatusEnum.Paid];

  try {
    const orders = await fetchOrders(startDate, endDate, statusFilter);

    if (orders.length === 0) {
      console.log('No orders found in the specified date range.\n');
      return { success: 0, errors: 0 };
    }

    console.log(`✓ Found ${orders.length} order(s)\n`);

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
        '/tmp',
        `packing-slip-${datePrefix}-${sanitizedOrderNumber}.pdf`,
      );

      try {
        await generatePackingSlip(order, outputPath);
        console.log(`✓ Generated: ${path.basename(outputPath)}`);
        console.log(`  Order: ${orderNumber}`);
        console.log(`  Status: ${order.orderStatus || 'UNKNOWN'}`);
        console.log(`  Items: ${order.lineItems?.length || 0}`);
        console.log(`  Ship to: ${order.toAddress?.name || 'N/A'}`);

        await printPDF(outputPath);
        console.log(`  Printed: ${path.basename(outputPath)}`);
        try {
          await unlink(outputPath);
        } catch (_cleanupError) {
          console.warn(`  Warning: failed to delete temp file ${outputPath}`);
        }

        console.log('');
        successCount++;
      } catch (error) {
        // A partial or empty file may have been written to outputPath before
        // the error was thrown. It will be cleaned up by the OS eventually
        // since it is in /tmp.
        console.error(`✗ Failed to process order ${orderNumber}`);
        if (error instanceof Error) {
          console.error(`  Error: ${error.message}`);
        } else {
          console.error(`  Error:`, error);
        }
        console.log('');
        errorCount++;
      }
    }

    return { success: successCount, errors: errorCount };
  } catch (error) {
    console.error('✗ Failed to fetch or process orders\n');
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error);
    }
    return { success: 0, errors: 1 };
  }
}

async function runLabelsJob(
  startDate: Date,
  endDate: Date,
): Promise<{ success: number; errors: number }> {
  console.log('Fetching transactions and downloading labels...');

  try {
    const transactions = await fetchTransactions(startDate, endDate);

    if (transactions.length === 0) {
      console.log('No labels found in the specified date range.\n');
      return { success: 0, errors: 0 };
    }

    console.log(`✓ Found ${transactions.length} label(s)\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const tx of transactions) {
      const objectId = (tx.objectId || 'unknown').replace(
        /[^a-zA-Z0-9-_]/g,
        '_',
      );
      const labelUrl = tx.labelUrl as string;

      // Extract and format the transaction date as YYYY-MM-DD
      let datePrefix = 'unknown-date';
      if (tx.objectCreated) {
        const txDate = tx.objectCreated;
        const year = txDate.getFullYear();
        const month = String(txDate.getMonth() + 1).padStart(2, '0');
        const day = String(txDate.getDate()).padStart(2, '0');
        datePrefix = `${year}-${month}-${day}`;
      }

      const outputPath = path.join(
        '/tmp',
        `label-${datePrefix}-${objectId}.pdf`,
      );

      try {
        const res = await fetch(labelUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
        await writeFile(outputPath, Buffer.from(await res.arrayBuffer()));
        console.log(`✓ Downloaded: ${path.basename(outputPath)}`);
        console.log(`  Tracking: ${tx.trackingNumber || 'N/A'}`);

        await printPDF(outputPath);
        console.log(`  Printed: ${path.basename(outputPath)}`);
        try {
          await unlink(outputPath);
        } catch (_e) {
          console.warn(`  Warning: failed to delete temp file ${outputPath}`);
        }

        console.log('');
        successCount++;
      } catch (error) {
        // A partial file may have been written before the error; /tmp is cleaned by OS
        console.error(`✗ Failed to process label for transaction ${objectId}`);
        if (error instanceof Error) {
          console.error(`  Error: ${error.message}`);
        } else {
          console.error(`  Error:`, error);
        }
        console.log('');
        errorCount++;
      }
    }

    return { success: successCount, errors: errorCount };
  } catch (error) {
    console.error('✗ Failed to fetch or process labels\n');
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error);
    }
    return { success: 0, errors: 1 };
  }
}

async function run() {
  // Verify API token is configured
  const apiToken = process.env.SHIPPO_API_TOKEN;
  if (!apiToken) {
    console.error('Error: SHIPPO_API_TOKEN not found in environment');
    console.error('Please add your production API token');
    process.exit(2);
  }

  if (!process.env.CUPS_PRINTER_NAME) {
    console.error('Error: CUPS_PRINTER_NAME not found in environment');
    process.exit(2);
  }

  // Calculate a date window aligned to the start of the current hour
  const timeWindowMinutes = parseInt(
    process.env.CRON_TIME_WINDOW_MINUTES ?? '60',
    10,
  );
  if (Number.isNaN(timeWindowMinutes) || timeWindowMinutes <= 0) {
    console.error(
      `Error: CRON_TIME_WINDOW_MINUTES must be a positive integer, got: ${process.env.CRON_TIME_WINDOW_MINUTES}`,
    );
    process.exit(2);
  }
  const endDate = new Date();
  endDate.setMinutes(0, 0, 0); // zero out minutes, seconds, and milliseconds
  const startDate = new Date(endDate.getTime() - timeWindowMinutes * 60 * 1000);

  console.log('Date range:');
  console.log('  Start:', startDate.toISOString());
  console.log('  End:  ', endDate.toISOString());
  console.log('');

  const slipResults = await runPackingSlipsJob(startDate, endDate);
  const labelResults = await runLabelsJob(startDate, endDate);

  const combinedErrors = slipResults.errors + labelResults.errors;

  console.log('='.repeat(50));
  console.log('Summary:');
  console.log(
    `  Packing slips: ${slipResults.success} generated, ${slipResults.errors} errors`,
  );
  console.log(
    `  Labels:        ${labelResults.success} downloaded, ${labelResults.errors} errors`,
  );
  console.log('='.repeat(50));

  process.exit(combinedErrors > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
