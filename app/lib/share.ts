// Share an assembly as a link: gzip + base64url in a `?a=` query param,
// entirely client-side (nothing is stored on a server). Same scheme as
// Rhombiverse's src/app/worldshare.js (`?w=`), so the two apps' share
// links behave identically.

export function compressionSupported(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64url.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encodeAssemblyForUrl(assembly: unknown): Promise<string> {
  const stream = new Blob([JSON.stringify(assembly)]).stream().pipeThrough(new CompressionStream('gzip'));
  return bytesToBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()));
}

export async function decodeAssemblyFromUrl(encoded: string): Promise<unknown> {
  const stream = new Blob([base64UrlToBytes(encoded)]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}

export const SHARE_PARAM = 'a';

export function buildShareUrl(encoded: string): string {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  url.searchParams.set(SHARE_PARAM, encoded);
  return url.toString();
}

export function getSharedAssemblyParam(): string | null {
  return new URLSearchParams(window.location.search).get(SHARE_PARAM);
}

export function clearSharedAssemblyParam(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(SHARE_PARAM);
  window.history.replaceState(null, '', url.toString());
}
