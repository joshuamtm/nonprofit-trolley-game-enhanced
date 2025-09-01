export function generateFingerprint(): string {
  // Simple browser fingerprinting for demo purposes
  // In production, consider using a library like fingerprintjs
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return generateRandomFingerprint();
  }

  // Canvas fingerprinting
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillStyle = '#f60';
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = '#069';
  ctx.fillText('Canvas fingerprint', 2, 15);
  ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
  ctx.fillText('Canvas fingerprint', 4, 17);

  const canvasData = canvas.toDataURL();
  
  // Combine with other browser properties
  const fingerprint = {
    canvas: canvasData,
    screen: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    vendor: navigator.vendor,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  };

  // Generate hash from fingerprint object
  return hashString(JSON.stringify(fingerprint));
}

function generateRandomFingerprint(): string {
  // Fallback for when canvas is not available
  return `fp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `fp-${Math.abs(hash).toString(36)}`;
}