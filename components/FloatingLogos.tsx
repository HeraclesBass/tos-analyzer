'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

interface FloatingLogosProps {
  companies: (string | null)[];
}

const KNOWN_DOMAINS: Record<string, string> = {
  'google': 'google.com',
  'facebook': 'facebook.com',
  'meta': 'meta.com',
  'amazon': 'amazon.com',
  'apple': 'apple.com',
  'microsoft': 'microsoft.com',
  'netflix': 'netflix.com',
  'spotify': 'spotify.com',
  'twitter': 'twitter.com',
  'x': 'x.com',
  'linkedin': 'linkedin.com',
  'instagram': 'instagram.com',
  'whatsapp': 'whatsapp.com',
  'tiktok': 'tiktok.com',
  'snapchat': 'snapchat.com',
  'discord': 'discord.com',
  'slack': 'slack.com',
  'zoom': 'zoom.com',
  'zoom communications': 'zoom.com',
  'dropbox': 'dropbox.com',
  'adobe': 'adobe.com',
  'salesforce': 'salesforce.com',
  'shopify': 'shopify.com',
  'stripe': 'stripe.com',
  'paypal': 'paypal.com',
  'uber': 'uber.com',
  'airbnb': 'airbnb.com',
  'reddit': 'reddit.com',
  'pinterest': 'pinterest.com',
  'twitch': 'twitch.tv',
  'github': 'github.com',
  'gitlab': 'gitlab.com',
  'atlassian': 'atlassian.com',
  'notion': 'notion.so',
  'figma': 'figma.com',
  'canva': 'canva.com',
  'openai': 'openai.com',
  'anthropic': 'anthropic.com',
  'oracle': 'oracle.com',
  'ibm': 'ibm.com',
  'samsung': 'samsung.com',
  'sony': 'sony.com',
  'nintendo': 'nintendo.com',
  'steam': 'steampowered.com',
  'epic': 'epicgames.com',
  'walmart': 'walmart.com',
  'ebay': 'ebay.com',
  'etsy': 'etsy.com',
  'doordash': 'doordash.com',
  'lyft': 'lyft.com',
  'jibe': 'jibe.com',
  'jibe mobile': 'jibe.com',
};

function getCompanyDomain(companyName: string): string | null {
  const normalized = companyName.toLowerCase().trim();
  if (KNOWN_DOMAINS[normalized]) return KNOWN_DOMAINS[normalized];
  for (const [key, domain] of Object.entries(KNOWN_DOMAINS)) {
    if (normalized.includes(key) || key.includes(normalized)) return domain;
  }
  const words = normalized.split(/\s+/);
  if (words.length > 0) {
    const firstWord = words[0].replace(/[^a-z0-9]/g, '');
    if (firstWord.length > 2) return `${firstWord}.com`;
  }
  return null;
}

function getInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getGradientForName(name: string): string {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface LogoPosition {
  id: string;
  name: string;
  domain: string | null;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

export function FloatingLogos({ companies }: FloatingLogosProps) {
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoPositions = useMemo(() => {
    const filtered = companies.filter((c): c is string => c !== null);
    const uniqueCompanies = Array.from(new Set(filtered));
    const positions: LogoPosition[] = [];

    uniqueCompanies.slice(0, 20).forEach((name, index) => {
      const seed = name.length + index * 1000;
      
      const x = 5 + seededRandom(seed) * 90;
      const duration = 20 + seededRandom(seed + 4) * 15;
      const delay = (index / 20) * duration + seededRandom(seed + 3) * 3;
      
      positions.push({
        id: `logo-${index}-${name}`,
        name,
        domain: getCompanyDomain(name),
        x,
        y: 0,
        size: 32 + seededRandom(seed + 2) * 24,
        delay,
        duration,
        opacity: 0.12 + seededRandom(seed + 5) * 0.1,
      });
    });

    return positions;
  }, [companies]);

  if (!mounted) return null;

  return (
    <div className="floating-logos" aria-hidden="true">
      {logoPositions.map((logo) => {
        const rotation = -10 + seededRandom(logo.name.length * 7) * 20;
        return (
          <div
            key={logo.id}
            className="floating-logo"
            style={{
              left: `${logo.x}%`,
              top: 0,
              width: logo.size,
              height: logo.size,
              '--fall-delay': `${logo.delay}s`,
              '--fall-duration': `${logo.duration}s`,
              '--logo-opacity': logo.opacity,
              '--end-rotation': `${rotation}deg`,
            } as React.CSSProperties}
          >
            {logo.domain && !failedLogos.has(logo.name) ? (
              <Image
                src={`https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${logo.domain}&size=128`}
                alt=""
                width={logo.size}
                height={logo.size}
                className="floating-logo__img"
                onError={() => setFailedLogos(prev => new Set(prev).add(logo.name))}
              unoptimized
            />
            ) : (
              <div 
                className="floating-logo__initials"
                style={{ background: getGradientForName(logo.name) }}
              >
                {getInitials(logo.name)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
