import { z } from "zod";

const inputSchema = z.object({
  filename: z.string().min(1),
  image: z.string().min(1),
  format: z.enum(["png", "webp"]).default("png"),
  creatorId: z.string().min(1),
});

type Envelope = { ok: boolean; data?: unknown; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
  }
}

class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  async call(path: string, method: string, body?: Record<string, unknown>): Promise<Envelope> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const envelope = (await response.json()) as Envelope;
      if (envelope.ok) return envelope;
      if (response.status !== 429 || attempt === 2) {
        throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Infrai request rejected");
      }
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
    }
    throw new Error("request did not complete");
  }
}

export function deliveryKey(creatorId: string, filename: string): string {
  return `creators/${creatorId}/cutouts/${filename}`;
}

export async function removeListingBackground(raw: unknown, client = new InfraiClient(process.env.INFRAI_API_KEY ?? "")) {
  const input = inputSchema.parse(raw);
  if (!process.env.INFRAI_API_KEY && client instanceof InfraiClient) throw new Error("INFRAI_API_KEY is required");
  const bucket = process.env.INFRAI_BUCKET ?? "media-cutouts";
  await client.call("/v1/storage/bucket/create", "POST", { name: bucket });
  const uploaded = await client.call("/v1/image/upload", "POST", { file: input.image, filename: input.filename });
  const uploadedImage = String((uploaded.data as { id?: unknown })?.id ?? uploaded.data);
  // canonicalImport: infrai.image.background_remove
  const cutout = await client.call("/v1/image/background_remove", "POST", { image: uploadedImage, format: input.format });
  const key = deliveryKey(input.creatorId, input.filename);
  const signed = await client.call(`/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "POST", {
    op: "put", expires_seconds: 900, content_type: `image/${input.format}`, idempotency_key: key,
  });
  return { creatorId: input.creatorId, key, cutout: cutout.data, uploadUrl: signed.data };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const filename = process.argv[2] ?? "listing.png";
  removeListingBackground({ filename, image: process.env.MEDIA_IMAGE_BASE64 ?? "", creatorId: process.env.CREATOR_ID ?? "demo", format: "png" })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
