import { apiCache } from './api-cache';
import { mockShopifyOrders } from './__mocks__/api-responses';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const SHOPIFY_STORE_URL = import.meta.env.VITE_SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN;

interface ShopifyOrder {
    id: string;
    orderNumber: string;
    createdAt: string;
    totalPrice: string;
    financialStatus: string;
    fulfillmentStatus: string;
    lineItems: Array<{
        title: string;
        quantity: number;
    }>;
}

export async function searchCustomerOrders(email: string): Promise<ShopifyOrder[]> {
    const cacheKey = `shopify:orders:${email}`;

    // Check cache first
    const cached = apiCache.get<ShopifyOrder[]>(cacheKey);
    if (cached) {
        return cached;
    }

    // Use mock data if enabled
    if (USE_MOCK || !SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
        apiCache.set(cacheKey, mockShopifyOrders);
        return mockShopifyOrders;
    }

    try {
        const query = `
      query getCustomerOrders($email: String!) {
        customers(first: 1, query: $email) {
          edges {
            node {
              orders(first: 3, reverse: true) {
                edges {
                  node {
                    id
                    name
                    createdAt
                    totalPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    displayFinancialStatus
                    displayFulfillmentStatus
                    lineItems(first: 10) {
                      edges {
                        node {
                          title
                          quantity
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

        const response = await fetch(`https://${SHOPIFY_STORE_URL}/admin/api/2024-01/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            },
            body: JSON.stringify({
                query,
                variables: { email: `email:${email}` },
            }),
        });

        const { data } = await response.json();

        if (!data?.customers?.edges?.[0]) {
            return [];
        }

        const orders: ShopifyOrder[] = data.customers.edges[0].node.orders.edges.map((edge: any) => {
            const order = edge.node;
            return {
                id: order.id,
                orderNumber: order.name,
                createdAt: order.createdAt,
                totalPrice: `${order.totalPriceSet.shopMoney.currencyCode} ${order.totalPriceSet.shopMoney.amount}`,
                financialStatus: order.displayFinancialStatus.toLowerCase(),
                fulfillmentStatus: order.displayFulfillmentStatus.toLowerCase(),
                lineItems: order.lineItems.edges.map((li: any) => ({
                    title: li.node.title,
                    quantity: li.node.quantity,
                })),
            };
        });

        apiCache.set(cacheKey, orders);
        return orders;

    } catch (error) {
        console.error('Error fetching Shopify orders:', error);
        return [];
    }
}
