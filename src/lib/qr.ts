import QRCode from 'qrcode';

export async function qrSvg(url: string, size = 180): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0b2a4a',
      light: '#ffffff',
    },
  });
}

export function absoluteUrl(path: string, siteUrl = 'https://zelmedservice.ru'): string {
  if (path.startsWith('http')) return path;
  const base = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return new URL(normalized, base).toString();
}
