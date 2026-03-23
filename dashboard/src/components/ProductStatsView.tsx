'use client';

import { IntercomStats, ProductStats } from '@/lib/intercom-types';
import ProductCard from './ProductCard';
import ProductDetailView from './ProductDetailView';
import { LayoutGrid, AlertCircle, PackageSearch } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ProductStatsViewProps {
    stats: IntercomStats;
}

export default function ProductStatsView({ stats }: ProductStatsViewProps) {
    const [selectedProduct, setSelectedProduct] = useState<ProductStats | null>(null);
    const products = stats.products || [];

    // Handle History State for "Back" navigation
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            // If we go back and there's no product in state/URL, clear selection
            const params = new URLSearchParams(window.location.search);
            const productParam = params.get('product');

            if (!productParam) {
                setSelectedProduct(null);
            } else {
                // Restore from URL if valid
                const product = products.find(p => p.name === productParam);
                if (product) setSelectedProduct(product);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [products]);

    const handleProductSelect = (product: ProductStats) => {
        setSelectedProduct(product);
        // Push state so back button works
        const url = new URL(window.location.href);
        url.searchParams.set('product', product.name);
        window.history.pushState({ product: product.name }, '', url.toString());
    };

    const handleBack = () => {
        setSelectedProduct(null);
        // Clean up URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete('product');
        window.history.pushState({}, '', url.toString());
    };

    if (selectedProduct) {
        return (
            <ProductDetailView
                product={selectedProduct}
                onBack={handleBack}
            />
        );
    }

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-700/50">
                <PackageSearch className="h-16 w-16 text-slate-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-300">No Product Data Found</h3>
                <p className="text-slate-500 mt-2 max-w-md text-center">
                    We couldn't define any product statistics from current conversations.
                    Ensure conversations are tagged or have 'Brand' attributes.
                </p>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                            <LayoutGrid className="h-6 w-6 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Product Solves Overview</h2>
                            <p className="text-slate-400 text-sm">Solved conversations segmented by brand & product</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                        <AlertCircle className="h-4 w-4 text-violet-400" />
                        <span className="text-xs font-medium text-slate-300">Click a card to drill down into brand details</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <div key={product.name} onClick={() => handleProductSelect(product)} className="cursor-pointer">
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>
            </div>
        </ErrorBoundary>
    );
}
