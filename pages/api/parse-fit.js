import { Decoder, Stream } from "@garmin/fitsdk";

// FIT files can carry a record every second for a long session — cap how
// many HR samples we keep so they stay cheap to store in localStorage.
const MAX_HR_SAMPLES = 3600;

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { fitBase64 } = req.body;
    if (!fitBase64) return res.status(400).json({ error: "fitBase64 required" });

    const buffer = Buffer.from(fitBase64, "base64");
    const stream = Stream.fromBuffer(buffer);
    if (!Decoder.isFIT(stream)) {
      return res.status(400).json({ error: "Not a valid FIT file" });
    }

    const decoder = new Decoder(stream);
    const { messages } = decoder.read();

    const session = messages.sessionMesgs?.[0];
    const records = (messages.recordMesgs || []).filter(r => r.timestamp && r.heartRate != null);

    let hrRecords = [];
    if (records.length > 0) {
      const startMs = records[0].timestamp.getTime();
      hrRecords = records.map(r => ({ t: Math.round((r.timestamp.getTime() - startMs) / 1000), hr: r.heartRate }));
      if (hrRecords.length > MAX_HR_SAMPLES) {
        const step = Math.ceil(hrRecords.length / MAX_HR_SAMPLES);
        hrRecords = hrRecords.filter((_, i) => i % step === 0);
      }
    }

    const hrValues = records.map(r => r.heartRate);
    const avgHr = session?.avgHeartRate ?? (hrValues.length ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : null);
    const maxHr = session?.maxHeartRate ?? (hrValues.length ? Math.max(...hrValues) : null);
    const durationSec = session?.totalElapsedTime ? Math.round(session.totalElapsedTime) : null;
    const calories = session?.totalCalories ?? null;

    res.status(200).json({ avgHr, maxHr, durationSec, calories, hrRecords });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
