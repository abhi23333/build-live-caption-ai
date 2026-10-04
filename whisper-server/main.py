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
            "confidence": None
        }

    input_path = None
    wav_path = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=".webm",
            delete=False
        ) as f:
            f.write(audio)
            input_path = f.name

        wav_path = input_path + ".wav"

        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                input_path,
                "-ar",
                "16000",
                "-ac",
                "1",
                wav_path,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        segments, info = model.transcribe(
            wav_path,
            language=whisper_language,
            beam_size=5,
            vad_filter=True,
        )

        text = " ".join(
            segment.text.strip()
            for segment in segments
            if segment.text.strip()
        )

        return {
            "text": text,
            "confidence": None,
            "language": info.language,
        }

    finally:
        for path in (input_path, wav_path):
            if path and os.path.exists(path):
                os.remove(path)
