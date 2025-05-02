export function floatToHex(x: number): string {
  const result: string[] = [];
  let quotient = Math.floor(x);
  let fraction = x - quotient;

  while (quotient > 0) {
    quotient = Math.floor(x / 16);
    const remainder = Math.floor(x - (quotient * 16));

    if (remainder > 9) {
      result.unshift(String.fromCharCode(remainder + 55));
    } else {
      result.unshift(remainder.toString());
    }

    x = quotient;
  }

  if (fraction === 0) {
    return result.join('');
  }

  result.push('.');

  while (fraction > 0) {
    fraction *= 16;
    const integer = Math.floor(fraction);
    fraction -= integer;

    if (integer > 9) {
      result.push(String.fromCharCode(integer + 55));
    } else {
      result.push(integer.toString());
    }
  }

  return result.join('');
}

export function isOdd(num: number): number {
  return num % 2 ? -1.0 : 0.0;
}

export function jsRound(num: number, ndigits: number = 0): number {
  const factor = Math.pow(10, ndigits);
  return Math.round(num * factor) / factor;
}

export function base64Encode(input: string | Uint8Array): string {
  if (typeof input === 'string') {
    return btoa(input);
  }
  return btoa(String.fromCharCode(...input));
}

export function base64Decode(input: string): Uint8Array {
  try {
    const binaryString = atob(input);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch {
    return new TextEncoder().encode(input);
  }
}

export async function handleXMigration(): Promise<Document> {
  const headers = {
    'Authority': 'x.com',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Referer': 'https://x.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'X-Twitter-Active-User': 'yes',
    'X-Twitter-Client-Language': 'en'
  };

  const migrationRedirectionRegex = /(http(?:s)?:\/\/(?:www\.)?(twitter|x){1}\.com(\/x)?\/migrate([\/?])?tok=[a-zA-Z0-9%\-_]+)+/;

  let response = await fetch('https://x.com', { headers });
  let html = await response.text();

  let doc = new DOMParser().parseFromString(html, 'text/html');

  // 检查迁移重定向
  const refreshMeta = doc.querySelector('meta[http-equiv="refresh"]');
  const migrationUrl = refreshMeta?.getAttribute('content')?.match(/url=(.+)/)?.[1];
  const migrationRedirectionUrl = migrationUrl || html.match(migrationRedirectionRegex)?.[0];

  if (migrationRedirectionUrl) {
    response = await fetch(migrationRedirectionUrl, { headers });
    html = await response.text();
    doc = new DOMParser().parseFromString(html, 'text/html');
  }

  // 检查迁移表单
  const migrationForm = doc.querySelector('form[name="f"]') || 
                       doc.querySelector('form[action="https://x.com/x/migrate"]');

  if (migrationForm) {
    const url = migrationForm.getAttribute('action') || 'https://x.com/x/migrate';
    const method = migrationForm.getAttribute('method') || 'POST';
    const formData = new FormData();

    migrationForm.querySelectorAll('input').forEach(input => {
      const name = input.getAttribute('name');
      const value = input.getAttribute('value');
      if (name && value) {
        formData.append(name, value);
      }
    });

    response = await fetch(url, {
      method,
      headers,
      body: formData
    });

    html = await response.text();
    doc = new DOMParser().parseFromString(html, 'text/html');
  }

  return doc;
} 