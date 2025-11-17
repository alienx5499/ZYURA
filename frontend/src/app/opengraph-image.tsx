import { ImageResponse } from 'next/og';

export const alt = 'ZYURA - Instant Flight Delay Insurance on Solana';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zyura.vercel.app';
    
    // Load a TTF font for ImageResponse (WOFF2 is not supported, need TTF/OTF)
    // ImageResponse REQUIRES at least one font, so we must ensure one loads
    // Using verified working Google Fonts TTF URL
    let interFont: ArrayBuffer | null = null;
    
    // Verified working font URL from Google Fonts API
    const workingFontUrl = 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf';
    
    try {
      const fontResponse = await fetch(workingFontUrl, {
        headers: {
          'Accept': 'font/ttf,application/octet-stream,*/*',
        },
      });
      
      if (fontResponse.ok) {
        const buffer = await fontResponse.arrayBuffer();
        // Check if it's a valid font file (TTF files are usually > 10KB)
        if (buffer && buffer.byteLength > 10000) {
          interFont = buffer;
        }
      }
    } catch (e) {
      // Font fetch failed - will throw error below
    }
    
    // CRITICAL: ImageResponse requires at least one font
    // If font loading fails, we must throw - ImageResponse cannot work without a font
    if (!interFont || interFont.byteLength === 0) {
      throw new Error('Failed to load font for OpenGraph image - font is required');
    }
    
    // Fetch the ZYURA logo SVG
    let logoUrl = null;
    try {
      // Try SVG first
      const logoSvgUrl = `${baseUrl}/logo.svg`;
      const logoSvgResponse = await fetch(logoSvgUrl);
      if (logoSvgResponse.ok) {
        logoUrl = logoSvgUrl;
      }
    } catch (e) {
      // If SVG fails, try PNG as fallback
      try {
        const logoPngUrl = `${baseUrl}/logo.png`;
        const logoPngResponse = await fetch(logoPngUrl);
        if (logoPngResponse.ok) {
          logoUrl = logoPngUrl;
        }
      } catch (e2) {
        // Logo fetch failed, will use text fallback
      }
    }

    return new ImageResponse(
      (
        <div
          style={{
            background: '#141413',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* ZYURA Logo Only */}
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="ZYURA"
              width={400}
              height={400}
            />
          ) : (
            <div
              style={{
                fontSize: 120,
                fontWeight: 'bold',
                color: '#ffffff',
                textAlign: 'center',
              }}
            >
              ZYURA
            </div>
          )}
        </div>
      ),
      {
        ...size,
        fonts: [
          {
            name: 'Inter',
            data: interFont,
            style: 'normal',
            weight: 400,
          },
        ],
      }
    );
  } catch (e) {
    // Log error for debugging
    console.error('OpenGraph image generation error:', e);
    
    // Try to load font for error fallback
    let errorFont: ArrayBuffer | null = null;
    try {
      const fontResponse = await fetch(
        'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf'
      );
      if (fontResponse.ok) {
        const buffer = await fontResponse.arrayBuffer();
        if (buffer && buffer.byteLength > 10000) {
          errorFont = buffer;
        }
      }
    } catch (fontError) {
      // Font loading failed
    }
    
    // Return simple error image - just logo or text
    return new ImageResponse(
      (
        <div
          style={{
            background: '#141413',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: 'bold',
              color: '#ffffff',
              textAlign: 'center',
            }}
          >
            ZYURA
          </div>
        </div>
      ),
      {
        ...size,
        fonts: errorFont
          ? [
              {
                name: 'Inter',
                data: errorFont,
                style: 'normal',
                weight: 400,
              },
            ]
          : [],
      }
    );
  }
}

