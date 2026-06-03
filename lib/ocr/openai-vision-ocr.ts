const OCR_PROMPT = `You are an OCR extraction engine for medical documents. Extract all visible text from this image exactly as written. Preserve numbers, units, lab values, reference ranges, dates, headings, and table structure as much as possible. Do not summarize, diagnose, explain, or add any new information. Return plain text only.`;

export async function extractTextWithOpenAiVision(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const model =
    process.env.OPENAI_OCR_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  const safeMime = mimeType?.startsWith("image/") ? mimeType : "image/jpeg";
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${safeMime};base64,${base64}`;

  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: OCR_PROMPT },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() || "";
}
