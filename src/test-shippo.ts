import dotenv from 'dotenv';

import { fetchOrders } from './lib/shippo';

// Load environment variables (.env.local overrides .env)
dotenv.config();
dotenv.config({ override: true, path: '.env.local' });

/**
 * Test script to verify Shippo API connectivity
 * Fetches orders from the last 30 days
 *
 * IMPORTANT: Uses SHIPPO_TEST_API_TOKEN to avoid touching production data
 */
async function testShippoAPI() {
  // Override production token with test token for this script
  const testToken = process.env.SHIPPO_TEST_API_TOKEN;

  if (!testToken) {
    console.error('Error: SHIPPO_TEST_API_TOKEN not found in .env.local');
    console.error('Please add a test token to avoid using production data');
    process.exit(2);
  }

  // Temporarily set test token for this script
  process.env.SHIPPO_API_TOKEN = testToken;

  console.log('Testing Shippo API integration...');
  console.log('Using test token (not production):\n');

  // Calculate date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  console.log('Fetching orders from:');
  console.log('  Start:', startDate.toISOString());
  console.log('  End:', endDate.toISOString());
  console.log('');

  try {
    const orders = await fetchOrders(startDate, endDate);

    console.log(`✓ Successfully fetched ${orders.length} order(s)\n`);

    if (orders.length > 0) {
      console.log('Sample order data:');
      const sampleOrder = orders[0];

      console.log('  Order ID:', sampleOrder.objectId);
      console.log('  Order Number:', sampleOrder.orderNumber);
      console.log('  Status:', sampleOrder.orderStatus);
      console.log('  Placed At:', sampleOrder.placedAt);
      console.log('  Shop:', sampleOrder.shopApp);
      console.log('  Ship To:', sampleOrder.toAddress?.name || 'N/A');
      console.log('  Items:', sampleOrder.lineItems?.length || 0);

      if (sampleOrder.lineItems && sampleOrder.lineItems.length > 0) {
        console.log('\n  First item:');
        const item = sampleOrder.lineItems[0];
        console.log('    Title:', item.title);
        console.log('    Variant:', item.variantTitle);
        console.log('    Quantity:', item.quantity);
        console.log('    Price:', item.totalPrice, item.currency);
      }
    } else {
      console.log('No orders found in the specified date range.');
      console.log('This is expected for a test account with no orders.');
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to fetch orders\n');
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

// Run the test
void testShippoAPI();
