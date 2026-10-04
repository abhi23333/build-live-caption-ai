import os
import io

import av
import numpy as np

from fastapi import FastAPI, Request, Query, Header, HTTPException
from faster_whisper import WhisperModel


app = FastAPI(title="LiveCaption AI Whisper ASR")


MODEL_SIZE = os.getenv("WHISPER_MODEL", "tiny")
API_KEY = os.getenv("ASR_API_KEY", "")


print(f"[ASR] Loading Whisper model: {MODEL_SIZE}")


model = WhisperModel(
    MODEL_SIZE,
    device="cpu",
    compute_type="int8",
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


@app.get("/health")
def health():

    return {
        "status": "ok",
        "model": MODEL_SIZE,
    }


@app.post("/transcribe")
async def transcribe(
    request: Request,
    language: str = Query("en-US"),
    authorization: str | None = Header(default=None),
):

    print("[ASR] Transcribe request received")
    print("[ASR] Language:", language)


    # -----------------------------
    # API KEY
    # -----------------------------

    if API_KEY:

        if authorization != f"Bearer {API_KEY}":

            print("[ASR] Invalid API key")

            raise HTTPException(
                status_code=401,
                detail="Invalid API key",
            )


    # -----------------------------
    # LANGUAGE
    # -----------------------------

    whisper_language = LANGUAGES.get(language)

    if not whisper_language:

        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {language}",
        )


    # -----------------------------
    # READ AUDIO
    # -----------------------------

    audio = await request.body()

    print(
        "[ASR] Received bytes:",
        len(audio),
    )


    if not audio:

        return {
            "text": "",
            "confidence": None,
            "language": whisper_language,
        }


    try:

        # -----------------------------
        # DECODE WEBM / OPUS USING PYAV
        # -----------------------------

        print("[ASR] Decoding audio with PyAV")


        container = av.open(
            io.BytesIO(audio)
        )


        audio_stream = None

        for stream in container.streams:

            if stream.type == "audio":

                audio_stream = stream
                break


        if audio_stream is None:

            raise RuntimeError(
                "No audio stream found in uploaded audio"
            )


        print(
            "[ASR] Audio codec:",
            audio_stream.codec_context.name,
        )


        resampler = av.audio.resampler.AudioResampler(
            format="s16",
            layout="mono",
            rate=16000,
        )


        audio_chunks = []


        for frame in container.decode(
            audio_stream
        ):

            converted = resampler.resample(
                frame
            )


            if not isinstance(
                converted,
                list
            ):

                converted = [converted]


            for output_frame in converted:

                array = output_frame.to_ndarray()

                audio_chunks.append(
                    array
                )


        container.close()


        if not audio_chunks:

            print(
                "[ASR] No audio samples decoded"
            )

            return {
                "text": "",
                "confidence": None,
                "language": whisper_language,
            }


        # -----------------------------
        # NUMPY AUDIO
        # -----------------------------

        audio_data = np.concatenate(
            audio_chunks,
            axis=1,
        ).reshape(-1)


        audio_data = (
            audio_data.astype(
                np.float32
            ) / 32768.0
        )


        duration = (
            len(audio_data) / 16000
        )


        print(
            f"[ASR] Audio duration: "
            f"{duration:.2f} seconds"
        )


        # -----------------------------
        # AUDIO DIAGNOSTICS
        # -----------------------------

        print(
            "[ASR] Audio min/max:",
            float(audio_data.min()),
            float(audio_data.max()),
        )


        print(
            "[ASR] Audio RMS:",
            float(
                np.sqrt(
                    np.mean(
                        audio_data ** 2
                    )
                )
            ),
        )


        if duration < 0.2:

            print(
                "[ASR] Audio is too short"
            )

            return {
                "text": "",
                "confidence": None,
                "language": whisper_language,
            }


        # -----------------------------
        # WHISPER
        # -----------------------------

        print(
            "[ASR] Starting Whisper..."
        )


        segments, info = model.transcribe(

            audio_data,

            language=whisper_language,

            beam_size=5,

            # IMPORTANT:
            # Disable VAD for live 4-second chunks
            vad_filter=False,

            condition_on_previous_text=False,

        )


        texts = []


        for segment in segments:

            text = segment.text.strip()

            if text:

                texts.append(text)


        final_text = " ".join(
            texts
        ).strip()


        print(
            "[ASR] FINAL TRANSCRIPT:",
            repr(final_text),
        )


        return {

            "text": final_text,

            "confidence": None,

            "language": info.language,

        }


    except Exception as error:

        import traceback

        print(
            "[ASR] ======================="
        )

        print(
            "[ASR] TRANSCRIPTION ERROR"
        )

        print(
            "[ASR] ======================="
        )

        print(
            str(error)
        )

        traceback.print_exc()


        raise HTTPException(

            status_code=500,

            detail=str(error),

        )
