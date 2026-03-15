import { config } from "../config";

export async function textToSpeech(
  text: string,
  voiceId: string = "21m00Tcm4TlvDq8ikWAM"
): Promise<ArrayBuffer | null> {
  if (!config.elevenlabsApiKey) return null;

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": config.elevenlabsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.slice(0, 5000),
          model_id: "eleven_monolingual_v1",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );
    if (!response.ok) throw new Error(`ElevenLabs error: ${response.status}`);
    return response.arrayBuffer();
  } catch (e) {
    console.error("ElevenLabs TTS failed:", e);
    return null;
  }
}

export async function speechToText(
  audioBytes: ArrayBuffer
): Promise<string | null> {
  if (!config.elevenlabsApiKey) return null;

  try {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([audioBytes], { type: "audio/webm" }),
      "audio.webm"
    );
    formData.append("model_id", "scribe_v1");

    const response = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: { "xi-api-key": config.elevenlabsApiKey },
        body: formData,
      }
    );
    if (!response.ok) throw new Error(`ElevenLabs error: ${response.status}`);
    const result = await response.json();
    return result.text || "";
  } catch (e) {
    console.error("ElevenLabs STT failed:", e);
    return null;
  }
}

export function isVoiceAvailable(): boolean {
  return !!config.elevenlabsApiKey;
}
