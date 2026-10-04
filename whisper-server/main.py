import os
import io
import numpy as np
import av

from fastapi import FastAPI, Request, Query, Header, HTTPException
from faster_whisper import WhisperModel


app = FastAPI(title="LiveCaption AI Whisper ASR")

MODEL_SIZE = os.getenv("WHISPER_MODEL", "tiny")
API_KEY = os.getenv("ASR_API_KEY", "")

print(f"[ASR] Loading Whisper model: {MODEL_SIZE}")

model = WhisperModel(
    MODEL_SIZE,
    device="cpu",
    compute_type="int8"
)

print("[ASR] Whisper model loaded")


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


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "LiveCaption AI Whisper ASR"
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

    print("[ASR] /transcribe request received")

    # API key check
    if API_KEY:
        if authorization != f"Bearer {API_KEY}":
            print("[ASR] Invalid API key")
            raise HTTPException(
                status_code=401,
                detail="Invalid API key"
            )

    whisper_language = LANGUAGES.get(language)

    if not whisper_language:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {language}"
        )

    # Read audio
    audio = await request.body()

    print(f"[ASR] Received audio bytes: {len(audio)}")

    if not audio:
        print("[ASR] Empty audio")
        return {
            "text": "",
            "confidence": None,
            "language": whisper_language
        }

    try:

        # ------------------------------------------------
        # Decode WebM / Opus using PyAV
        # ------------------------------------------------

        print("[ASR] Opening audio with PyAV")

        container = av.open(
            io.BytesIO(audio),
            format="webm"
        )

        audio_stream = container.streams.audio[0]

        print(
            "[ASR] Audio stream:",
            audio_stream
        )

        resampler = av.audio.resampler.AudioResampler(
            format="s16",
            layout="mono",
            rate=16000
        )

        samples = []

        for frame in container.decode(audio_stream):

            frames = resampler.resample(frame)

            if not isinstance(frames, list):
                frames = [frames]

            for output_frame in frames:

                array = output_frame.to_ndarray()

                samples.append(array)

        container.close()

        if not samples:
            print("[ASR] No decoded samples")

            return {
                "text": "",
                "confidence": None,
                "language": whisper_language
            }

        # ------------------------------------------------
        # Convert audio to Whisper format
        # ------------------------------------------------

        audio_data = np.concatenate(
            samples,
            axis=1
        ).flatten()

        audio_data = audio_data.astype(
            np.float32
        ) / 32768.0

        duration = len(audio_data) / 16000

        print(
            f"[ASR] Decoded audio duration: "
            f"{duration:.2f} seconds"
        )

        if duration < 0.2:

            print("[ASR] Audio too short")

            return {
                "text": "",
                "confidence": None,
                "language": whisper_language
            }

        # ------------------------------------------------
        # Whisper
        # ------------------------------------------------

        print(
            f"[ASR] Starting Whisper "
            f"language={whisper_language}"
        )

        segments, info = model.transcribe(
            audio_data,
            language=whisper_language,
            beam_size=1,
            vad_filter=True,
            condition_on_previous_text=False
        )

        texts = []

        for segment in segments:

            text = segment.text.strip()

            if text:
                texts.append(text)

        final_text = " ".join(texts).strip()

        print(
            f"[ASR] FINAL TRANSCRIPT: "
            f"{final_text!r}"
        )

        return {
            "text": final_text,
            "confidence": None,
            "language": info.language
        }

    except Exception as error:

        import traceback

        print("[ASR] =========================")
        print("[ASR] TRANSCRIPTION ERROR")
        print("[ASR] =========================")
        print(str(error))

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )
