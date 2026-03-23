import { useState } from 'react';
import { Search, ShoppingBag, Package, CheckCircle, XCircle, Clock, Mail } from 'lucide-react';
import { searchCustomerOrders } from '../services/shopify';
import { formatDistanceToNow } from 'date-fns';

export default function ShopifySearch() {
    const [email, setEmail] = useState('');
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setSearched(false);

        try {
            const results = await searchCustomerOrders(email.trim());
            setOrders(results);
            setSearched(true);
        } catch (error) {
            console.error('Error searching orders:', error);
            setOrders([]);
            setSearched(true);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        if (status.includes('fulfilled') || status.includes('paid')) {
            return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
        } else if (status.includes('pending') || status.includes('partial')) {
            return <Clock className="w-3.5 h-3.5 text-amber-400" />;
        } else {
            return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="section-header">
                <ShoppingBag className="w-3.5 h-3.5" />
                CUSTOMER ORDERS
            </h2>

            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(148, 163, 184, 0.5)' }} />
                <input
                    type="email"
                    placeholder="customer@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-glass pl-11 pr-24"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="btn-glass-primary absolute right-2 top-1/2 -translate-y-1/2"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }}
                >
                    <Search className="w-3.5 h-3.5 mr-1.5 inline" />
                    Search
                </button>
            </form>

            {/* Loading */}
            {loading && (
                <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="glass-card p-4 h-28" />
                    ))}
                </div>
            )}

            {/* Results */}
            {!loading && searched && (
                <>
                    {orders.length === 0 ? (
                        <div className="glass-card p-8 text-center">
                            <ShoppingBag className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(148, 163, 184, 0.3)' }} />
                            <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                No orders found
                            </p>
                            <p className="text-xs" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>
                                Try a different email
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {orders.map((order) => (
                                <div key={order.id} className="glass-card p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <span className="font-mono font-extrabold text-sky-400">
                                                {order.orderNumber}
                                            </span>
                                            <div className="text-xs mt-1" style={{ color: 'rgba(148, 163, 184, 0.7)' }}>
                                                {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                                            </div>
                                        </div>
                                        <div className="text-xl font-extrabold text-white">
                                            {order.totalPrice}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mb-3 pb-3" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                                        <div className="badge-glass">
                                            {getStatusIcon(order.financialStatus)}
                                            <span className="capitalize text-xs">{order.financialStatus}</span>
                                        </div>
                                        <div className="badge-glass">
                                            {getStatusIcon(order.fulfillmentStatus)}
                                            <span className="capitalize text-xs">{order.fulfillmentStatus}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {order.lineItems.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                <Package className="w-3 h-3" style={{ color: 'rgba(148, 163, 184, 0.5)' }} />
                                                <span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                                                    <span className="font-bold text-white">{item.quantity}x</span> {item.title}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
