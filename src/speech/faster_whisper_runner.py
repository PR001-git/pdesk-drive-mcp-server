"""Minimal CLI wrapper around faster-whisper for use by the MCP server.

Usage:
    python faster_whisper_runner.py <model> <device> <language> <audio_file_path>

Prints the full transcript to stdout (concatenated segment texts).
Exits non-zero on error, prints error to stderr.
"""

import sys


def main() -> None:
    if len(sys.argv) != 5:
        print(
            f"Usage: {sys.argv[0]} <model> <device> <language> <audio_file_path>",
            file=sys.stderr,
        )
        sys.exit(1)

    model_size = sys.argv[1]
    device = sys.argv[2]
    language = sys.argv[3]
    audio_path = sys.argv[4]

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(
            "faster-whisper is not installed. Run: pip install faster-whisper",
            file=sys.stderr,
        )
        sys.exit(1)

    model = WhisperModel(model_size, device=device)
    segments, _info = model.transcribe(audio_path, language=language)

    transcript = " ".join(segment.text.strip() for segment in segments)
    print(transcript)


if __name__ == "__main__":
    main()
