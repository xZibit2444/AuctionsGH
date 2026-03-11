import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const alt = 'Auction listing preview';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

interface AuctionOgImageProps {
  params: Promise<{ id: string }>;
}

function formatAmount(amount: number | null | undefined) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return 'Price unavailable';
  }

  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    maximumFractionDigits: 0,
  }).format(amount);
}

function normalizeStatus(status: string | null | undefined) {
  if (!status) return 'Auction';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function AuctionOpenGraphImage({
  params,
}: AuctionOgImageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('auctions')
    .select(
      'title, brand, model, condition, current_price, status, auction_images(url, position)'
    )
    .eq('id', id)
    .single();

  const auction = data as
    | {
        title: string | null;
        brand: string | null;
        model: string | null;
        condition: string | null;
        current_price: number | null;
        status: string | null;
        auction_images: { url: string; position: number | null }[] | null;
      }
    | null;

  const primaryImage =
    auction?.auction_images
      ?.slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ?? null;
  const title =
    auction?.title?.trim() ||
    [auction?.brand, auction?.model].filter(Boolean).join(' ') ||
    'Live auction on AuctionsGH';
  const condition = auction?.condition?.trim() || 'Verified listing';
  const status = normalizeStatus(auction?.status);
  const price = formatAmount(auction?.current_price);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flex: 1,
            padding: '34px',
            gap: '28px',
            background:
              'linear-gradient(135deg, #020617 0%, #111827 55%, #1e3a8a 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: '58%',
              padding: '20px 10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: '10px 18px',
                  borderRadius: '9999px',
                  background: 'rgba(59,130,246,0.2)',
                  border: '1px solid rgba(147,197,253,0.35)',
                  color: '#bfdbfe',
                  fontWeight: 700,
                }}
              >
                {status}
              </div>
              <div style={{ color: 'rgba(248,250,252,0.7)' }}>AuctionsGH</div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: '64px',
                  lineHeight: 1.03,
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                }}
              >
                {title}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '28px',
                  lineHeight: 1.3,
                  color: 'rgba(248,250,252,0.8)',
                }}
              >
                {condition}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: '24px',
                  color: '#93c5fd',
                }}
              >
                Current price
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '58px',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                }}
              >
                {price}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              width: '42%',
              borderRadius: '30px',
              overflow: 'hidden',
              position: 'relative',
              background:
                'linear-gradient(180deg, rgba(30,41,59,0.96), rgba(15,23,42,0.96))',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {primaryImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={primaryImage}
                alt={title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    'radial-gradient(circle at top, rgba(96,165,250,0.35), transparent 30%), linear-gradient(180deg, #111827 0%, #020617 100%)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '18px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '120px',
                      height: '120px',
                      borderRadius: '28px',
                      background: 'rgba(255,255,255,0.1)',
                      fontSize: '56px',
                      fontWeight: 800,
                    }}
                  >
                    A
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: '34px',
                      fontWeight: 700,
                    }}
                  >
                    AuctionsGH
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(2,6,23,0.02) 0%, rgba(2,6,23,0.24) 65%, rgba(2,6,23,0.68) 100%)',
              }}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}
