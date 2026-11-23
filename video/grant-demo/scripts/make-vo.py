"""Generate the Grant launch film voiceover with Edge TTS.

Requires: pip install edge-tts, ffmpeg, ffprobe.
Run from video/grant-demo: python scripts/make-vo.py
Writes assets/audio/vo.mp3 at 48 kHz stereo, 122 seconds.
"""
from __future__ import annotations

import asyncio
import json
import subprocess
import tempfile
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "audio" / "vo.mp3"
VOICE = "en-US-AvaNeural"
TOTAL = 122.0

# start seconds, maximum seconds, text
SEGMENTS = [
    (0.8, 10.0, "A music license is more than a price. It's a set of limits, and a line you only find after you export."),
    (11.8, 11.0, "Grant is a music checkout for freelance editors. It shows what a track's license actually allows, before you approve. One screen. Six checks."),
    (24.8, 13.0, "You describe the cut. The platforms, the term, the territory. Grant turns that into terms, then ranks the catalogue against them. Eight tracks. Every reason comes from the offer."),
    (39.8, 14.0, "Every quote is six checks. Platform, term, territory, client, reposting, future. Filled is covered. Hollow is not. Organic coverage does not include paid ads."),
    (55.8, 13.0, "Ask for paid ads on a track that doesn't offer them, and Grant refuses the quote. No signature. No reservation. No receipt. A refusal is cheaper than a bad license."),
    (70.8, 16.0, "When the terms fit, the payment settles on Stellar testnet. One US dollar, from buyer to seller. Then the license, the audio, and a public proof page. Real testnet settlement. No real money."),
    (88.8, 13.0, "The seller publishes its terms over x402. The agent reads them, refuses before signing if the brief doesn't fit, and pays once when it does. Two refusals. One payment."),
    (103.8, 8.0, "Live demo, same code. Next.js, Neon, Stellar, x402."),
    (113.8, 6.0, "Grant. Know what the license covers before you export."),
]

RATES = ["-8%", "-6%", "-4%", "-2%", "+0%"]


def run(command: list[str]) -> None:
    subprocess.run(command, check=True, capture_output=True)


def duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(json.loads(result.stdout)["format"]["duration"])


async def synth(text: str, rate: str, path: Path) -> None:
    communicate = edge_tts.Communicate(text, VOICE, rate=rate, pitch="-2Hz")
    await communicate.save(str(path))


async def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="grant-vo-") as temp:
        temp_dir = Path(temp)
        clips: list[tuple[float, Path]] = []
        for index, (start, limit, text) in enumerate(SEGMENTS, start=1):
            chosen = None
            for rate in RATES:
                raw = temp_dir / f"raw-{index}.mp3"
                await synth(text, rate, raw)
                length = duration(raw)
                if length <= limit:
                    chosen = (rate, length, raw)
                    break
            if chosen is None:
                raise SystemExit(f"segment {index} is too long even at 0%: {length:.2f}s > {limit:.2f}s")
            rate, length, raw = chosen
            wav = temp_dir / f"seg-{index}.wav"
            run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-ar", "48000", "-ac", "2", str(wav)])
            clips.append((start, wav))
            print(f"{index}: start {start:6.1f}s  length {length:5.2f}s  limit {limit:4.1f}s  rate {rate}")

        base = temp_dir / "base.wav"
        run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", str(TOTAL), str(base)])

        command = ["ffmpeg", "-v", "error", "-y", "-i", str(base)]
        filters = []
        labels = ["[0:a]"]
        for index, (start, path) in enumerate(clips, start=1):
            command += ["-i", str(path)]
            delay = round(start * 1000)
            filters.append(f"[{index}:a]adelay={delay}|{delay}[a{index}]")
            labels.append(f"[a{index}]")
        filters.append("".join(labels) + f"amix=inputs={len(labels)}:duration=first:normalize=0[out]")
        command += ["-filter_complex", ";".join(filters), "-map", "[out]", "-ar", "48000", "-ac", "2", str(OUT)]
        run(command)
        print(f"wrote {OUT} ({duration(OUT):.2f}s)")


if __name__ == "__main__":
    asyncio.run(main())
