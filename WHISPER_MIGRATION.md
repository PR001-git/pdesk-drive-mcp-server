## Problem

Current `SpeechRepository` uses Google Cloud Speech-to-Text (polling, 10+ min latency, $0.024–$0.048/min). Need local transcription for speed and cost.

## Task

Replace Google Cloud API with local OpenAI Whisper via Python subprocess.

## Architecture Changes

- **Replace:** `SpeechRepository` (googleapis) → `WhisperTranscriber` (subprocess)
- **Implement interface:** `ISpeechRepository` (existing contract)
- **Preserve:** MCP tool handler, progress callbacks, error handling
- **Remove:** Google Cloud dependencies, `GOOGLE_CLOUD_BUCKET` env var

## Constraints

- Audio formats: auto-detected by Whisper (MP3, WAV, FLAC, OGG, WebM)
- Language support: all current codes work (`languageCode` parameter)
- Process timeout: 30m (corrupt audio protection)
- No streaming output (acceptable for local, sync process)

## Success Criteria

- [ ] 5-min file transcribed in < 2 minutes
- [ ] All existing tests pass (interface unchanged)
- [ ] Clear setup error if Whisper not installed
- [ ] Graceful failure on corrupt audio (timeout)

## Key Decision: Progress Reporting

Whisper CLI doesn't emit structured progress. Options:

1. **Time-based estimate** — report fake milestones (30%, 60%, 90%)
2. **No progress** — complete silently, return result
3. **Stream stderr** — parse stdout for file processing logs

