// Mock API responses for development and testing

export const mockIntercomData = {
    solved: {
        personal: {
            week: 45,
            month: 142
        },
        team: {
            week: 385,
            month: 1240
        }
    },
    leaderboard: [
        { id: '7706965', name: 'Mauro (T2 UK)', count: 184, avatar: null },
        { id: '3669480', name: 'Moll (Team Leader UK)', count: 165, avatar: null },
        { id: '8219930', name: 'Manvir (T2 UK)', count: 152, avatar: null },
        { id: '8215044', name: 'Jenson (T1 UK)', count: 148, avatar: null },
        { id: '8853567', name: 'Luke (T1 UK)', count: 140, avatar: null }
    ],
    conversationStates: {
        open: 8,
        snoozed: 3,
        pending: 2
    },
    csat: {
        week: {
            percentage: 88,
            positiveRatings: 22,
            totalRatings: 25
        },
        month: {
            percentage: 85,
            positiveRatings: 89,
            totalRatings: 105
        }
    },
    chatVolume: {
        total: 127,
        unassigned: 8,
        active: 23,
        closed_today: 42,
    },
};

export const mockJiraData = {
    tickets: [
        {
            project: 'REVIEWS',
            key: 'REV-1234',
            summary: 'Customer unable to see reviews widget',
            status: 'In Progress',
            priority: 'High',
            slaTimeRemaining: 45 * 60 * 1000,
            assignee: 'John Doe',
        },
        {
            project: 'INFLUENCE',
            key: 'INF-567',
            summary: 'Discount codes not applying correctly',
            status: 'Open',
            priority: 'Medium',
            slaTimeRemaining: 120 * 60 * 1000,
            assignee: 'Unassigned',
        },
        {
            project: 'BOOST',
            key: 'BST-890',
            summary: 'Product recommendations not displaying',
            status: 'In Progress',
            priority: 'High',
            slaTimeRemaining: 25 * 60 * 1000,
            assignee: 'Sarah Smith',
        },
    ],
    counts: {
        REVIEWS: 15,
        INFLUENCE: 8,
        BOOST: 12,
        total: 35,
    },
};

export const mockShopifyOrders = [
    {
        id: '4567890123',
        orderNumber: '#1234',
        createdAt: '2024-01-05T14:30:00Z',
        totalPrice: '$127.50',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        lineItems: [
            { title: 'Premium T-Shirt', quantity: 2 },
            { title: 'Baseball Cap', quantity: 1 },
        ],
    },
    {
        id: '4567890122',
        orderNumber: '#1189',
        createdAt: '2023-12-28T10:15:00Z',
        totalPrice: '$89.99',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        lineItems: [
            { title: 'Hoodie - Black', quantity: 1 },
        ],
    },
    {
        id: '4567890121',
        orderNumber: '#1098',
        createdAt: '2023-12-15T16:45:00Z',
        totalPrice: '$245.00',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        lineItems: [
            { title: 'Winter Jacket', quantity: 1 },
            { title: 'Beanie', quantity: 2 },
        ],
    },
];

export const mockConfluenceResults = [
    {
        id: 'conf-123',
        title: 'Troubleshooting Widget Display Issues',
        excerpt: 'Common causes for widgets not displaying include: 1) JavaScript conflicts with theme, 2) Incorrect widget placement code, 3) Browser caching issues...',
        url: 'https://confluence.example.com/wiki/troubleshooting-widgets',
        content: `
# Troubleshooting Widget Display Issues

## Common Causes

1. **JavaScript Conflicts**: Check browser console for errors
   - Look for conflicts with other scripts
   - Verify jQuery version compatibility
   
2. **Widget Placement**: 
   - Ensure widget code is placed before closing </body> tag
   - Check if theme has specific placement requirements
   
3. **Cache Issues**:
   - Clear browser cache
   - Clear CDN cache if applicable
   - Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)

## Resolution Steps

1. Open browser DevTools (F12)
2. Check Console tab for JavaScript errors
3. Verify Network tab shows widget assets loading
4. Check Elements tab to confirm widget HTML is present
    `,
    },
    {
        id: 'conf-124',
        title: 'Discount Code Not Applying - Debug Guide',
        excerpt: 'When discount codes fail to apply, follow this systematic debugging approach: verify code validity, check cart requirements, review customer eligibility...',
        url: 'https://confluence.example.com/wiki/discount-debugging',
        content: `
# Discount Code Debugging

## Verification Checklist

- [ ] Code is active (check start/end dates)
- [ ] Minimum purchase requirement met
- [ ] Product/collection restrictions satisfied
- [ ] Customer eligibility (new vs returning)
- [ ] Usage limit not exceeded
- [ ] Not combined with incompatible discounts

## Common Issues

**Code appears invalid**: Check expiration date and usage limits
**Code applies but shows $0 discount**: Verify cart meets minimum requirements
**Code not visible at checkout**: Clear session cookies
    `,
    },
];

export const mockGamificationData = {
    ticketsClosed: 18,
    bonusAmount: 36.00,
    recentCloses: [
        { timestamp: Date.now() - 5 * 60 * 1000, ticketKey: 'REV-1001' },
        { timestamp: Date.now() - 12 * 60 * 1000, ticketKey: 'INF-502' },
        { timestamp: Date.now() - 25 * 60 * 1000, ticketKey: 'BST-701' },
        { timestamp: Date.now() - 35 * 60 * 1000, ticketKey: 'REV-999' },
        { timestamp: Date.now() - 50 * 60 * 1000, ticketKey: 'INF-488' },
    ],
    isOnFire: false,
};
