import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
    Activity,
    ArrowUpRight,
    BadgeAlert,
    BarChart3,
    BellRing,
    ChevronRight,
    ClipboardList,
    DollarSign,
    Gavel,
    Package,
    ShieldCheck,
    Store,
    Truck,
    Users,
} from 'lucide-react';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency } from '@/lib/utils';

type SearchParamsShape = Promise<Record<string, string | string[] | undefined>>;

interface DashboardPageProps {
    searchParams?: SearchParamsShape;
}

interface DashboardKpis {
    gmv: number;
    completed_orders: number;
    live_auctions: number;
    sold_auctions: number;
    sell_through_rate: number;
    avg_final_price: number;
    pending_applications: number;
    delivery_issues: number;
    push_opt_in_rate: number;
    bid_volume: number;
    avg_bids_per_sold_auction: number;
    ghost_failed_rate: number;
}

interface DailyMetric {
    day: string;
    auctions_created: number;
    auctions_sold: number;
    bid_count: number;
    orders_created: number;
    orders_completed: number;
    gmv_completed: number;
    comment_count: number;
    offer_count: number;
    saved_count: number;
}

interface FunnelMetrics {
    auctions_sold: number;
    orders_created: number;
    pending_payment: number;
    funds_held: number;
    in_delivery: number;
    completed: number;
    failed: number;
}

interface ApplicationsMetrics {
    pending: number;
    approved: number;
    rejected: number;
    avg_review_hours: number;
}

interface TrustMetrics {
    ghosted_orders: number;
    pin_refused_orders: number;
    refunded_orders: number;
    deliveries_stuck: number;
    high_attempt_pins: number;
    messages_waiting: number;
}

interface SellerMetric {
    seller_id: string;
    username: string | null;
    full_name: string | null;
    location: string | null;
    is_verified: boolean;
    listings_total: number;
    listings_active: number;
    listings_sold: number;
    completed_orders: number;
    gmv: number;
    avg_rating: number;
    review_count: number;
    total_bids: number;
    offer_count?: number;
    comment_count?: number;
    saved_count?: number;
    last_listing_at?: string | null;
}

interface BuyerMetric {
    buyer_id: string;
    username: string | null;
    full_name: string | null;
    location: string | null;
    bids_placed: number;
    auctions_won: number;
    orders_completed: number;
    total_spend: number;
    failed_orders: number;
    last_bid_at?: string | null;
}

interface MarketplaceRow {
    auction_id: string;
    title: string;
    brand: string | null;
    model: string | null;
    listing_city: string | null;
    status: string;
    current_price: number;
    bid_count: number;
    created_at: string;
    seller_name: string | null;
    saves: number;
    comments: number;
    offers: number;
    order_id?: string | null;
    order_status?: string | null;
    delivery_status?: string | null;
}

interface DashboardPayload {
    kpis: DashboardKpis;
    daily: DailyMetric[];
    funnel: FunnelMetrics;
    applications: ApplicationsMetrics;
    trust: TrustMetrics;
    top_sellers: SellerMetric[];
    top_buyers: BuyerMetric[];
    marketplace: MarketplaceRow[];
    seller_performance: SellerMetric[];
}

interface SelectOption {
    value: string;
    label: string;
}

interface AnalyticsRpcResponse {
    data: DashboardPayload | null;
    error: { message?: string } | null;
}

interface AnalyticsRpcClient {
    rpc: (
        fn: 'get_super_admin_dashboard',
        args: {
            p_start_date: string | null;
            p_end_date: string | null;
            p_seller_id: string | null;
            p_city: string | null;
            p_fulfillment_type: string | null;
            p_status: string | null;
        }
    ) => Promise<AnalyticsRpcResponse>;
}

function getScalarParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 29);
    return date.toISOString().slice(0, 10);
}

function getTodayDate() {
    return new Date().toISOString().slice(0, 10);
}

function formatCompactNumber(value: number) {
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value: number) {
    return `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;
}

function formatDateLabel(value: string) {
    return new Date(value).toLocaleDateString('en-GH', { month: 'short', day: 'numeric' });
}

function formatStatus(value?: string | null) {
    if (!value) return 'None';
    return value.replace(/_/g, ' ');
}

function buildPolyline(values: number[], width: number, height: number) {
    if (values.length === 0) return '';
    const max = Math.max(...values, 1);
    return values
        .map((value, index) => {
            const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
            const y = height - (value / max) * height;
            return `${x},${y}`;
        })
        .join(' ');
}

function initialBadge(name?: string | null, fallback = 'U') {
    if (!name) return fallback;
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return fallback;
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function KpiCard({
    label,
    value,
    help,
    icon: Icon,
}: {
    label: string;
    value: string;
    help: string;
    icon: React.ElementType;
}) {
    return (
        <div className="border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                    <p className="mt-3 text-2xl font-black text-black tracking-tight">{value}</p>
                    <p className="mt-2 text-xs text-gray-500 leading-5">{help}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center bg-black text-white">
                    <Icon className="h-4 w-4" />
                </div>
            </div>
        </div>
    );
}

function Section({
    title,
    eyebrow,
    children,
    action,
    className = '',
}: {
    title: string;
    eyebrow?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={`border border-gray-200 bg-white ${className}`}>
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
                <div>
                    {eyebrow && <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{eyebrow}</p>}
                    <h2 className="mt-1 text-lg font-black text-black tracking-tight">{title}</h2>
                </div>
                {action}
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

function TrendChart({ data }: { data: DailyMetric[] }) {
    const width = 760;
    const height = 220;
    const gmvValues = data.map((point) => Number(point.gmv_completed) || 0);
    const orderValues = data.map((point) => point.orders_completed);
    const auctionValues = data.map((point) => point.auctions_created);

    const gmvPath = buildPolyline(gmvValues, width, height);
    const orderPath = buildPolyline(orderValues, width, height);
    const auctionPath = buildPolyline(auctionValues, width, height);

    const xAxisLabels = data.filter((_, index) => index % Math.max(1, Math.floor(data.length / 6)) === 0);

    return (
        <div>
            <div className="mb-4 flex flex-wrap gap-4 text-xs font-semibold">
                <span className="inline-flex items-center gap-2 text-black"><span className="h-2.5 w-2.5 bg-black" /> GMV</span>
                <span className="inline-flex items-center gap-2 text-gray-600"><span className="h-2.5 w-2.5 bg-amber-400" /> Completed Orders</span>
                <span className="inline-flex items-center gap-2 text-gray-600"><span className="h-2.5 w-2.5 bg-gray-300" /> Auctions Created</span>
            </div>
            <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${width} ${height + 24}`} className="min-w-full">
                    {[0.25, 0.5, 0.75, 1].map((ratio) => (
                        <line
                            key={ratio}
                            x1="0"
                            x2={width}
                            y1={height - height * ratio}
                            y2={height - height * ratio}
                            stroke="#f1f5f9"
                            strokeWidth="1"
                        />
                    ))}
                    <polyline fill="none" stroke="#111111" strokeWidth="3" points={gmvPath} />
                    <polyline fill="none" stroke="#fbbf24" strokeWidth="3" points={orderPath} />
                    <polyline fill="none" stroke="#cbd5e1" strokeWidth="3" points={auctionPath} />
                    {xAxisLabels.map((point, index) => {
                        const dataIndex = data.findIndex((entry) => entry.day === point.day);
                        const x = data.length === 1 ? width / 2 : (dataIndex / (data.length - 1)) * width;
                        return (
                            <text
                                key={`${point.day}-${index}`}
                                x={x}
                                y={height + 18}
                                textAnchor="middle"
                                className="fill-gray-400 text-[10px] font-semibold"
                            >
                                {formatDateLabel(point.day)}
                            </text>
                        );
                    })}
                </svg>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">GMV total</p>
                    <p className="mt-2 text-lg font-black text-black">
                        {formatCurrency(gmvValues.reduce((sum, value) => sum + value, 0))}
                    </p>
                </div>
                <div className="border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Orders completed</p>
                    <p className="mt-2 text-lg font-black text-black">
                        {orderValues.reduce((sum, value) => sum + value, 0)}
                    </p>
                </div>
                <div className="border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Auctions created</p>
                    <p className="mt-2 text-lg font-black text-black">
                        {auctionValues.reduce((sum, value) => sum + value, 0)}
                    </p>
                </div>
            </div>
        </div>
    );
}

function FunnelChart({ funnel }: { funnel: FunnelMetrics }) {
    const steps = [
        { label: 'Auctions Sold', value: funnel.auctions_sold, tone: 'bg-black' },
        { label: 'Orders Created', value: funnel.orders_created, tone: 'bg-gray-800' },
        { label: 'Pending Payment', value: funnel.pending_payment, tone: 'bg-gray-500' },
        { label: 'Funds Held', value: funnel.funds_held, tone: 'bg-amber-400' },
        { label: 'In Delivery', value: funnel.in_delivery, tone: 'bg-amber-300' },
        { label: 'Completed', value: funnel.completed, tone: 'bg-emerald-500' },
        { label: 'Failed', value: funnel.failed, tone: 'bg-red-400' },
    ];

    const max = Math.max(...steps.map((step) => step.value), 1);

    return (
        <div className="space-y-3">
            {steps.map((step) => (
                <div key={step.label}>
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold text-gray-500">
                        <span>{step.label}</span>
                        <span className="text-black">{formatCompactNumber(step.value)}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100">
                        <div className={`h-2.5 ${step.tone}`} style={{ width: `${(step.value / max) * 100}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function Leaderboard({
    rows,
    getValue,
    money = false,
    emptyLabel,
    kind,
}: {
    rows: Array<SellerMetric | BuyerMetric>;
    getValue: (row: SellerMetric | BuyerMetric) => number;
    money?: boolean;
    emptyLabel: string;
    kind: 'seller' | 'buyer';
}) {
    const values = rows.map((row) => Number(getValue(row) || 0));
    const max = Math.max(...values, 1);

    if (rows.length === 0) {
        return <p className="text-sm text-gray-500">{emptyLabel}</p>;
    }

    return (
        <div className="space-y-4">
            {rows.slice(0, 6).map((row) => {
                const name = row.full_name || row.username || (kind === 'seller' ? 'Seller' : 'Buyer');
                const value = Number(getValue(row) || 0);
                const href = kind === 'seller' ? `/sellers/${'seller_id' in row ? row.seller_id : ''}` : null;

                return (
                    <div key={kind === 'seller' ? (row as SellerMetric).seller_id : (row as BuyerMetric).buyer_id}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-black">{name}</p>
                                <p className="text-xs text-gray-500">
                                    {kind === 'seller'
                                        ? `${(row as SellerMetric).completed_orders} completed orders`
                                        : `${(row as BuyerMetric).orders_completed} completed orders`}
                                </p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-sm font-black text-black">
                                    {money ? formatCurrency(value) : formatCompactNumber(value)}
                                </p>
                                {href && (
                                    <Link href={href} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black">
                                        Open
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="h-2 bg-gray-100">
                            <div className="h-2 bg-black" style={{ width: `${(value / max) * 100}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function AlertsPanel({ trust, applications }: { trust: TrustMetrics; applications: ApplicationsMetrics }) {
    const alerts = [
        { label: 'Ghosted orders', value: trust.ghosted_orders, tone: trust.ghosted_orders > 0 ? 'text-red-600' : 'text-emerald-600' },
        { label: 'Pin refused orders', value: trust.pin_refused_orders, tone: trust.pin_refused_orders > 0 ? 'text-red-600' : 'text-emerald-600' },
        { label: 'Refunded orders', value: trust.refunded_orders, tone: trust.refunded_orders > 0 ? 'text-red-600' : 'text-emerald-600' },
        { label: 'Deliveries stuck', value: trust.deliveries_stuck, tone: trust.deliveries_stuck > 0 ? 'text-amber-600' : 'text-emerald-600' },
        { label: 'High-risk PIN attempts', value: trust.high_attempt_pins, tone: trust.high_attempt_pins > 0 ? 'text-amber-600' : 'text-emerald-600' },
        { label: 'Pending applications', value: applications.pending, tone: applications.pending > 0 ? 'text-amber-600' : 'text-emerald-600' },
    ];

    return (
        <div className="space-y-3">
            {alerts.map((alert) => (
                <div key={alert.label} className="flex items-center justify-between border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-sm font-semibold text-black">{alert.label}</p>
                    <p className={`text-lg font-black ${alert.tone}`}>{alert.value}</p>
                </div>
            ))}
            <div className="border border-gray-200 bg-black p-4 text-white">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Application review time</p>
                <p className="mt-2 text-2xl font-black">{applications.avg_review_hours}h</p>
                <p className="mt-2 text-xs text-white/70">Average time from seller application submission to review.</p>
            </div>
        </div>
    );
}

async function getDashboardData(filters: {
    startDate: string;
    endDate: string;
    sellerId: string;
    city: string;
    fulfillmentType: string;
    status: string;
}) {
    const admin = createAdminClient() as unknown as AnalyticsRpcClient;

    const { data, error } = await admin.rpc('get_super_admin_dashboard', {
        p_start_date: filters.startDate || null,
        p_end_date: filters.endDate || null,
        p_seller_id: filters.sellerId || null,
        p_city: filters.city || null,
        p_fulfillment_type: filters.fulfillmentType || null,
        p_status: filters.status || null,
    });

    if (error) {
        throw new Error(error.message || 'Failed to load analytics.');
    }

    return data as DashboardPayload;
}

export default async function AdminAnalyticsPage({ searchParams }: DashboardPageProps) {
    const params = searchParams ? await searchParams : {};
    const startDate = getScalarParam(params.start) || getDefaultStartDate();
    const endDate = getScalarParam(params.end) || getTodayDate();
    const sellerId = getScalarParam(params.seller) || '';
    const city = getScalarParam(params.city) || '';
    const fulfillmentType = getScalarParam(params.fulfillment) || '';
    const status = getScalarParam(params.status) || '';

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single() as { data: { is_super_admin: boolean } | null; error: unknown };

    if (!profile?.is_super_admin) {
        redirect('/');
    }

    const admin = createAdminClient();
    const [{ data: sellersRaw }, { data: citiesRaw }, analytics] = await Promise.all([
        admin
            .from('profiles')
            .select('id, username, full_name')
            .eq('is_admin', true)
            .order('username', { ascending: true }),
        admin
            .from('auctions')
            .select('listing_city')
            .not('listing_city', 'is', null),
        getDashboardData({ startDate, endDate, sellerId, city, fulfillmentType, status }),
    ]);

    const sellerOptions: SelectOption[] = ((sellersRaw ?? []) as Array<{ id: string; username?: string | null; full_name?: string | null }>)
        .map((seller) => ({
            value: seller.id,
            label: seller.full_name || seller.username || 'Seller',
        }));

    const cityOptions: SelectOption[] = Array.from(
        new Set(
            ((citiesRaw ?? []) as Array<{ listing_city?: string | null }>)
                .map((row) => row.listing_city)
                .filter((value): value is string => Boolean(value))
        )
    )
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value }));

    const data = analytics;
    const kpis = data.kpis;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-24 sm:pb-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest mb-3">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Superior Admin Analytics
                    </div>
                    <h1 className="text-3xl font-black text-black tracking-tight">Marketplace Control Tower</h1>
                    <p className="text-sm text-gray-500 mt-2 max-w-3xl">
                        Revenue, seller performance, order funnel, trust signals, and live marketplace health in one dashboard.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/admin/applications"
                        className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-black hover:text-black transition-colors"
                    >
                        <ClipboardList className="h-4 w-4" />
                        Seller Applications
                    </Link>
                    <Link
                        href="/admin/orders"
                        className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-black hover:text-black transition-colors"
                    >
                        <Package className="h-4 w-4" />
                        Order Monitor
                    </Link>
                </div>
            </div>

            <section className="border border-gray-200 bg-white mb-8">
                <div className="border-b border-gray-100 px-5 py-4">
                    <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Filters</h2>
                </div>
                <form className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 p-5">
                    <label className="block">
                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400">Start</span>
                        <input type="date" name="start" defaultValue={startDate} className="w-full border border-gray-200 px-3 py-2.5 text-sm text-black focus:outline-none focus:border-black" />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400">End</span>
                        <input type="date" name="end" defaultValue={endDate} className="w-full border border-gray-200 px-3 py-2.5 text-sm text-black focus:outline-none focus:border-black" />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400">City</span>
                        <select name="city" defaultValue={city} className="w-full border border-gray-200 px-3 py-2.5 text-sm text-black focus:outline-none focus:border-black">
                            <option value="">All cities</option>
                            {cityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400">Seller</span>
                        <select name="seller" defaultValue={sellerId} className="w-full border border-gray-200 px-3 py-2.5 text-sm text-black focus:outline-none focus:border-black">
                            <option value="">All sellers</option>
                            {sellerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400">Fulfillment</span>
                        <select name="fulfillment" defaultValue={fulfillmentType} className="w-full border border-gray-200 px-3 py-2.5 text-sm text-black focus:outline-none focus:border-black">
                            <option value="">All types</option>
                            <option value="meet_and_inspect">Meet & Inspect</option>
                            <option value="escrow_delivery">Escrow Delivery</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400">Order status</span>
                        <select name="status" defaultValue={status} className="w-full border border-gray-200 px-3 py-2.5 text-sm text-black focus:outline-none focus:border-black">
                            <option value="">All statuses</option>
                            {['pending_meetup', 'pending_payment', 'funds_held', 'in_delivery', 'completed', 'pin_verified', 'ghosted', 'pin_refused', 'refunded', 'cancelled_by_buyer', 'cancelled_by_seller', 'cancelled_unpaid', 'cancelled_admin'].map((value) => (
                                <option key={value} value={value}>{formatStatus(value)}</option>
                            ))}
                        </select>
                    </label>
                    <div className="xl:col-span-6 flex flex-wrap gap-3">
                        <button type="submit" className="inline-flex items-center gap-2 bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 transition-colors">
                            <BarChart3 className="h-4 w-4" />
                            Apply Filters
                        </button>
                        <Link href="/admin/analytics" className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-black hover:text-black transition-colors">
                            Reset
                        </Link>
                    </div>
                </form>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <KpiCard label="GMV" value={formatCurrency(kpis.gmv)} help="Completed cash value in the selected range." icon={DollarSign} />
                <KpiCard label="Completed Orders" value={formatCompactNumber(kpis.completed_orders)} help="Orders that reached completed or pin verified." icon={Package} />
                <KpiCard label="Live Auctions" value={formatCompactNumber(kpis.live_auctions)} help="Active listings currently competing for bids." icon={Store} />
                <KpiCard label="Sell-through Rate" value={formatPercent(kpis.sell_through_rate)} help="Share of ended listings that actually sold." icon={Activity} />
                <KpiCard label="Average Final Price" value={formatCurrency(kpis.avg_final_price)} help="Average closed sale price." icon={ArrowUpRight} />
                <KpiCard label="Bid Volume" value={formatCompactNumber(kpis.bid_volume)} help="Total bids placed in the selected period." icon={Gavel} />
                <KpiCard label="Delivery Issues" value={formatCompactNumber(kpis.delivery_issues)} help="Delivery records still pending, sent, or waiting confirmation." icon={Truck} />
                <KpiCard label="Push Opt-in Rate" value={formatPercent(kpis.push_opt_in_rate)} help="Profiles with device notification tokens saved." icon={BellRing} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-8">
                <Section title="GMV / Orders / Listings Trend" eyebrow="Overview" className="xl:col-span-8">
                    <TrendChart data={data.daily} />
                </Section>
                <Section title="Order Funnel" eyebrow="Conversion" className="xl:col-span-4">
                    <FunnelChart funnel={data.funnel} />
                </Section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-8">
                <Section
                    title="Top Sellers"
                    eyebrow="Leaderboards"
                    className="xl:col-span-4"
                    action={<Link href="#seller-performance" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black">Open table</Link>}
                >
                    <Leaderboard rows={data.top_sellers} getValue={(row) => ('gmv' in row ? row.gmv : 0)} money emptyLabel="No seller activity in this range." kind="seller" />
                </Section>
                <Section title="Top Buyers" eyebrow="Leaderboards" className="xl:col-span-4">
                    <Leaderboard rows={data.top_buyers} getValue={(row) => ('total_spend' in row ? row.total_spend : 0)} money emptyLabel="No buyer activity in this range." kind="buyer" />
                </Section>
                <Section title="Trust & Risk Alerts" eyebrow="Risk" className="xl:col-span-4">
                    <AlertsPanel trust={data.trust} applications={data.applications} />
                </Section>
            </div>

            <Section title="Marketplace Activity" eyebrow="Listings" className="mb-8">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead>
                            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <th className="pb-3 pr-4">Listing</th>
                                <th className="pb-3 pr-4">Seller</th>
                                <th className="pb-3 pr-4">City</th>
                                <th className="pb-3 pr-4">Engagement</th>
                                <th className="pb-3 pr-4">Statuses</th>
                                <th className="pb-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {data.marketplace.length === 0 ? (
                                <tr><td colSpan={6} className="py-12 text-center text-gray-500">No listing activity for this filter set.</td></tr>
                            ) : data.marketplace.map((row) => (
                                <tr key={row.auction_id}>
                                    <td className="py-4 pr-4">
                                        <p className="font-bold text-black">{row.title}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {row.brand || 'Item'} {row.model || ''} • {formatCurrency(row.current_price)}
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-1">{new Date(row.created_at).toLocaleString('en-GH')}</p>
                                    </td>
                                    <td className="py-4 pr-4 text-gray-700">{row.seller_name || 'Seller'}</td>
                                    <td className="py-4 pr-4 text-gray-700">{row.listing_city || '—'}</td>
                                    <td className="py-4 pr-4">
                                        <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-gray-600">
                                            <span className="border border-gray-200 px-2 py-1">Bids {row.bid_count}</span>
                                            <span className="border border-gray-200 px-2 py-1">Saves {row.saves}</span>
                                            <span className="border border-gray-200 px-2 py-1">Comments {row.comments}</span>
                                            <span className="border border-gray-200 px-2 py-1">Offers {row.offers}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 pr-4">
                                        <div className="space-y-1 text-[11px] font-semibold text-gray-600">
                                            <p>Auction: <span className="text-black">{formatStatus(row.status)}</span></p>
                                            <p>Order: <span className="text-black">{formatStatus(row.order_status)}</span></p>
                                            <p>Delivery: <span className="text-black">{formatStatus(row.delivery_status)}</span></p>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex flex-col gap-2 text-[11px] font-black uppercase tracking-widest">
                                            <Link href={`/auctions/${row.auction_id}`} className="text-gray-500 hover:text-black">Open listing</Link>
                                            {row.order_id && <Link href={`/orders/${row.order_id}`} className="text-gray-500 hover:text-black">Open order</Link>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section title="Seller Performance Table" eyebrow="Sellers" className="mb-8" action={<div id="seller-performance" />}>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead>
                            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <th className="pb-3 pr-4">Seller</th>
                                <th className="pb-3 pr-4">Listings</th>
                                <th className="pb-3 pr-4">Orders</th>
                                <th className="pb-3 pr-4">GMV</th>
                                <th className="pb-3 pr-4">Rating</th>
                                <th className="pb-3 pr-4">Engagement</th>
                                <th className="pb-3">Open</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {data.seller_performance.length === 0 ? (
                                <tr><td colSpan={7} className="py-12 text-center text-gray-500">No seller performance data in this range.</td></tr>
                            ) : data.seller_performance.map((seller) => {
                                const name = seller.full_name || seller.username || 'Seller';
                                return (
                                    <tr key={seller.seller_id}>
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center bg-black text-xs font-black text-white">
                                                    {initialBadge(name, 'S')}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-black">{name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {(seller.is_verified ? 'Verified' : 'Unverified')} • {seller.location || 'No location'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4 text-gray-700">
                                            <p>Total {seller.listings_total}</p>
                                            <p className="text-xs text-gray-500">Active {seller.listings_active} • Sold {seller.listings_sold}</p>
                                        </td>
                                        <td className="py-4 pr-4 text-gray-700">{seller.completed_orders}</td>
                                        <td className="py-4 pr-4 font-black text-black">{formatCurrency(seller.gmv)}</td>
                                        <td className="py-4 pr-4 text-gray-700">
                                            {seller.avg_rating.toFixed(1)} <span className="text-xs text-gray-500">({seller.review_count})</span>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-gray-600">
                                                <span className="border border-gray-200 px-2 py-1">Bids {seller.total_bids}</span>
                                                <span className="border border-gray-200 px-2 py-1">Saves {seller.saved_count || 0}</span>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <Link href={`/sellers/${seller.seller_id}`} className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-black">
                                                View <ChevronRight className="h-3 w-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 bg-white p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Application pipeline</p>
                    <div className="mt-4 space-y-2 text-sm text-gray-700">
                        <p className="flex items-center justify-between"><span>Pending</span><span className="font-black text-black">{data.applications.pending}</span></p>
                        <p className="flex items-center justify-between"><span>Approved</span><span className="font-black text-black">{data.applications.approved}</span></p>
                        <p className="flex items-center justify-between"><span>Rejected</span><span className="font-black text-black">{data.applications.rejected}</span></p>
                    </div>
                </div>
                <div className="border border-gray-200 bg-white p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Marketplace quality</p>
                    <div className="mt-4 space-y-2 text-sm text-gray-700">
                        <p className="flex items-center justify-between"><span>Avg bids / sold auction</span><span className="font-black text-black">{kpis.avg_bids_per_sold_auction.toFixed(2)}</span></p>
                        <p className="flex items-center justify-between"><span>Ghost / failed rate</span><span className="font-black text-black">{formatPercent(kpis.ghost_failed_rate)}</span></p>
                        <p className="flex items-center justify-between"><span>Sold auctions</span><span className="font-black text-black">{kpis.sold_auctions}</span></p>
                    </div>
                </div>
                <div className="border border-gray-200 bg-black p-5 text-white">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">What to build next</p>
                    <div className="mt-4 space-y-3 text-sm text-white/80">
                        <p className="flex items-start gap-2"><BadgeAlert className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" /> Add notification delivery/open event tracking for deeper push analytics.</p>
                        <p className="flex items-start gap-2"><Users className="h-4 w-4 text-emerald-300 shrink-0 mt-0.5" /> Move seller favorites from local storage into Supabase for real seller-follow analytics.</p>
                        <p className="flex items-start gap-2"><Store className="h-4 w-4 text-sky-300 shrink-0 mt-0.5" /> Add listing impressions/clicks to measure browse-to-order conversion by category.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
