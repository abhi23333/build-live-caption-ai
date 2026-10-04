import os
import io
import numpy as np
import av

from fastapi import FastAPI, Request, Query, Header, HTTPException
from faster_whisper import WhisperModel


app = FastAPI(title="LiveCaption AI Whisper ASR")

MODEL_SIZE = os.getenv("WHISPER_MODEL", "tiny")
API_KEY = os.getenv("ASR_API_KEY", "")

print(f"Loading Whisper model: {MODEL_SIZE}")

model = WhisperModel(
    MODEL_SIZE,
    device="cpu",
    compute_type="int8"
)


LANGUAGES = {
    "en-US": "en",
    "hi-IN": "hi",
    "te-IN": "te",
    "ta-IN": "ta",
    "kn-IN": "kn",
    "ml-IN": "ml",
    "mr-IN": "mr",
    "bn-IN": "bn",
}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_SIZE
    }


@app.post("/transcribe")
async def transcribe(
    request: Request,
    language: str = Query("en-US"),
    authorization: str | None = Header(default=None),
):
    if API_KEY and authorization != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Invalid API key")

    whisper_language = LANGUAGES.get(language)

    if not whisper_language:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {language}"
        )

    audio = await request.body()

    if not audio:
        return {
            "text": "",
            "confidence": None,
            "language": whisper_language,
        }

    try:
        print(
            f"[ASR] Received {len(audio)} bytes "
            f"for language {language}"
        )

        container = av.open(io.BytesIO(audio))

        audio_stream = container.streams.audio[0]

        resampler = av.audio.resampler.AudioResampler(
            format="fltp",
            layout="mono",
            rate=16000,
        )

        samples = []

        for frame in container.decode(audio_stream):
            resampled = resampler.resample(frame)

            if not isinstance(resampled, list):
                resampled = [resampled]

            for output_frame in resampled:
                samples.append(
                    output_frame.to_ndarray()
                )

        container.close()

        if not samples:
            return {
                "text": "",
                "confidence": None,
                "language": whisper_language,
            }

        audio_data = np.concatenate(
            samples,
            axis=1,
        ).flatten()

        audio_data = audio_data.astype(np.float32)

        print(
            f"[ASR] Decoded {len(audio_data) / 16000:.2f} "
            f"seconds of audio"
        )

        segments, info = model.transcribe(
            audio_data,
            language=whisper_language,
            beam_size=5,
            vad_filter=True,
        )

        text = " ".join(
            segment.text.strip()
            for segment in segments
            if segment.text.strip()
        )

        print(f"[ASR] Transcript: {text!r}")

        return {
            "text": text,
            "confidence": None,
            "language": info.language,
        }

    except Exception as error:
        print(f"[ASR] Transcription error: {error}")

        raise HTTPException(
            status_code=500,
            detail=f"Audio transcription failed: {error}",
        )
