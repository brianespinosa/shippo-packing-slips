import { Shippo } from 'shippo';
import type {
  Order,
  OrderStatusEnum,
  Transaction,
} from 'shippo/models/components';
import { TransactionStatusEnum } from 'shippo/models/components';

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
 * @param orderStatus - Optional array of order statuses to filter by (e.g., [OrderStatusEnum.Paid])
 * @returns Array of order objects from Shippo
 */
export async function fetchOrders(
  startDate: Date,
  endDate: Date,
  orderStatus?: OrderStatusEnum[],
): Promise<Order[]> {
  const client = createShippoClient();

  // Convert dates to ISO 8601 format (required by Shippo API)
  const startDateISO = startDate.toISOString();
  const endDateISO = endDate.toISOString();

  try {
    const allOrders: Order[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      // Fetch orders for current page
      const response = await client.orders.list({
        endDate: endDateISO,
        orderStatus,
        page,
        results: 25, // Default page size
        startDate: startDateISO,
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

/**
 * Fetch successful transactions from Shippo within a specified date range.
 * The API does not support server-side date filtering, so we paginate newest-first
 * and stop once results fall before startDate.
 * @param startDate - Start of date range (inclusive)
 * @param endDate - End of date range (inclusive)
 * @returns Array of Transaction objects within the date range that have a truthy labelUrl
 */
export async function fetchTransactions(
  startDate: Date,
  endDate: Date,
): Promise<Transaction[]> {
  const client = createShippoClient();

  try {
    const matched: Transaction[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await client.transactions.list({
        objectStatus: TransactionStatusEnum.Success,
        page,
        results: 25,
      });

      const pageResults = response.results ?? [];

      for (const tx of pageResults) {
        const created = tx.objectCreated;

        // Results are newest-first; stop paging once we're before the window
        if (created && created < startDate) {
          console.log(
            `  Stopping pagination: reached transaction before window (${created.toISOString()})`,
          );
          hasMore = false;
          break;
        }

        if (
          created &&
          created >= startDate &&
          created <= endDate &&
          tx.labelUrl
        ) {
          matched.push(tx);
        }
      }

      if (hasMore) {
        hasMore = !!response.next;
        page++;
      }
    }

    return matched;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to fetch transactions from Shippo: ${error.message}`,
      );
    }
    throw new Error('Failed to fetch transactions from Shippo: Unknown error');
  }
}
