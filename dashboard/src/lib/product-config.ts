/**
 * Centralized product configuration with Intercom tag IDs, team mappings,
 * and brand aliases. Single source of truth for product extraction.
 */

export interface ProductDef {
    /** Canonical display name */
    name: string;
    /** Intercom tag IDs that definitively identify this product */
    tagIds: string[];
    /** Brand attribute values (case-insensitive partial match) */
    brandAliases: string[];
    /** Ticket type names (case-insensitive partial match) */
    ticketTypeAliases: string[];
    /** Store ID prefixes in ticket_attributes */
    storeIdPrefixes: string[];
    /** Product-specific team IDs in Intercom */
    teamIds: number[];
}

/**
 * Hardcoded product definitions — verified against Intercom API.
 * Tag IDs are immutable in Intercom, so these won't break if someone renames a tag.
 */
export const PRODUCT_CONFIGS: ProductDef[] = [
    {
        name: 'Reviews.io',
        tagIds: ['9210481'],
        brandAliases: ['reviews.io', 'reviews'],
        ticketTypeAliases: ['reviews.io', 'reviews', 'cancellation'],
        storeIdPrefixes: ['RI_'],
        teamIds: [7096884], // REVIEWS.io - Support (T1 main)
    },
    {
        name: 'Influence',
        tagIds: [],
        brandAliases: ['influence'],
        ticketTypeAliases: ['influence'],
        storeIdPrefixes: ['INF_'],
        teamIds: [7096885], // Influence.io
    },
    {
        name: 'Boost',
        tagIds: ['9210493'],
        brandAliases: ['boost'],
        ticketTypeAliases: ['boost'],
        storeIdPrefixes: ['BST_'],
        teamIds: [7102413], // Boost T1
    },
    {
        name: 'Clearer',
        tagIds: [],
        brandAliases: ['clearer'],
        ticketTypeAliases: ['clearer'],
        storeIdPrefixes: [],
        teamIds: [],
    },
    {
        name: 'ViralSweep',
        tagIds: [],
        brandAliases: ['viralsweep'],
        ticketTypeAliases: ['viralsweep'],
        storeIdPrefixes: ['VS_'],
        teamIds: [7102403], // ViralSweep
    },
    {
        name: 'Rich Returns',
        tagIds: [],
        brandAliases: ['rich returns', 'richreturns'],
        ticketTypeAliases: ['rich returns', 'richreturns'],
        storeIdPrefixes: ['RR_'],
        teamIds: [7102402], // T1 - Rich Returns
    },
    {
        name: 'ConversionBear',
        tagIds: ['9210487', '9394466'],
        brandAliases: ['conversionbear', 'conversion bear'],
        ticketTypeAliases: ['conversionbear', 'conversion bear'],
        storeIdPrefixes: [],
        teamIds: [7102395], // Conversion Bear
    },
    {
        name: 'Address Validator',
        tagIds: [],
        brandAliases: ['address validator'],
        ticketTypeAliases: ['address validator'],
        storeIdPrefixes: [],
        teamIds: [7102393], // Address Validator
    },
];

/** Map of tag ID → product name for O(1) lookup */
export const TAG_ID_TO_PRODUCT: Record<string, string> = {};
for (const p of PRODUCT_CONFIGS) {
    for (const tid of p.tagIds) {
        TAG_ID_TO_PRODUCT[tid] = p.name;
    }
}

/** T1 affiliated team IDs — verified against Intercom /teams API 2026-02-27 */
export const T1_AFFILIATED_TEAM_IDS = new Set([
    7096884,   // REVIEWS.io - Support (T1 main)
    7096885,   // Influence.io
    7102395,   // Conversion Bear
    7102402,   // T1 - Rich Returns
    7102403,   // ViralSweep
    7102413,   // Boost T1
]);
