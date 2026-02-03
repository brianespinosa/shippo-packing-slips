import { Shippo } from 'shippo';

/**
 * Initialize Shippo client with API token from environment
 *
 * Uses SHIPPO_API_TOKEN which should be the production token.
 * Test scripts should override this with SHIPPO_TEST_API_TOKEN.
 */
export function createShippoClient(): Shippo {
  const apiToken = process.env.SHIPPO_API_TOKEN;

  if (!apiToken) {
    throw new Error('SHIPPO_API_TOKEN environment variable is required');
  }

  return new Shippo({
    apiKeyHeader: apiToken,
  });
}

/**
 * Fetch orders from Shippo within a specified date range
 * @param startDate - Start of date range (orders placed after this time)
 * @param endDate - End of date range (orders placed before this time)
 * @returns Array of order objects from Shippo
 */
export async function fetchOrders(
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  const client = createShippoClient();

  // Convert dates to ISO 8601 format (required by Shippo API)
  const startDateISO = startDate.toISOString();
  const endDateISO = endDate.toISOString();

  try {
    const allOrders: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      // Fetch orders for current page
      const response = await client.orders.list({
        page,
        results: 25, // Default page size
        startDate: startDateISO,
        endDate: endDateISO,
      });

      // Add orders from this page to our collection
      if (response.results && response.results.length > 0) {
        allOrders.push(...response.results);
      }

      // Check if there are more pages
      // The 'next' field contains a URL if there are more results
      hasMore = !!response.next;
      page++;
    }

    return allOrders;
  } catch (error) {
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Failed to fetch orders from Shippo: ${error.message}`);
    }
    throw new Error('Failed to fetch orders from Shippo: Unknown error');
  }
}
