import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'AuctionsGH social preview';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, #0f172a 0%, #111827 40%, #1d4ed8 100%)',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at top right, rgba(96,165,250,0.28), transparent 35%), radial-gradient(circle at bottom left, rgba(34,197,94,0.18), transparent 30%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            padding: '56px',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '72px',
                height: '72px',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                fontSize: '34px',
                fontWeight: 800,
              }}
            >
              A
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ fontSize: '22px', opacity: 0.78 }}>
                Ghana&apos;s online auction marketplace
              </div>
              <div style={{ fontSize: '42px', fontWeight: 800 }}>AuctionsGH</div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: '760px',
              gap: '18px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '24px',
                fontWeight: 700,
                color: '#bfdbfe',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '9999px',
                  background: '#22c55e',
                }}
              />
              Live bids, direct offers, secure checkout
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '68px',
                lineHeight: 1.04,
                fontWeight: 800,
                letterSpacing: '-0.04em',
              }}
            >
              Buy and sell electronics across Ghana.
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '28px',
                lineHeight: 1.35,
                color: 'rgba(248,250,252,0.82)',
              }}
            >
              Share listings that look professional on WhatsApp, Facebook, X, and more.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '14px',
                fontSize: '22px',
                color: 'rgba(248,250,252,0.85)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: '12px 18px',
                  borderRadius: '9999px',
                  background: 'rgba(255,255,255,0.1)',
                }}
              >
                Phones
              </div>
              <div
                style={{
                  display: 'flex',
                  padding: '12px 18px',
                  borderRadius: '9999px',
                  background: 'rgba(255,255,255,0.1)',
                }}
              >
                Laptops
              </div>
              <div
                style={{
                  display: 'flex',
                  padding: '12px 18px',
                  borderRadius: '9999px',
                  background: 'rgba(255,255,255,0.1)',
                }}
              >
                Accessories
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '22px',
                color: '#dbeafe',
              }}
            >
              auctionsgh.com
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
