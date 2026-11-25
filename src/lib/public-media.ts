const mediaPathFormat = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\/(?:logo|hero|gallery)\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:jpg|png|webp)$/;
export const publicMediaPrefix = "/api/vetrine/immagini/";

export function publicMediaUrl(path: string | null) {
  return path && mediaPathFormat.test(path) ? publicMediaPrefix + path : null;
}
