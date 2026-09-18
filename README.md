# Imprace AI

Practice interviews on your phone with AI that runs **entirely on-device** — your answers never leave your device.

Imprace AI is a cross-platform (iOS + Android) interview prep app. It listens to your spoken answers, responds as an interviewer, and speaks back — all without a network connection and without sending a single byte to a server.

## Why on-device?

- **Private by default** — audio and transcripts stay on your phone.
- **Works offline** — no server, no account, no latency round-trips.
- **Yours** — no data collection, no usage tied to your identity.

## How it works

The whole voice loop runs locally through a shared C++ [Nitro](https://nitro.margelo.com/) module:

| Stage                | Model / Engine                       |
| -------------------- | ------------------------------------ |
| Speech-to-text (ASR) | Whisper via `whisper.cpp` (ggml)     |
| Reasoning (LLM)      | Gemma via LiteRT-LM                  |
| Text-to-speech (TTS) | Kitten TTS on ONNX Runtime (XNNPACK) |

## Stack

- React Native + Nitro modules (JSI / C++)
- Native inference bridged through Kotlin (Android) and Swift (iOS)
- ONNX Runtime, LiteRT, and whisper.cpp unified in one native module

## Status

Active development. See open issues for current work.

## License

TBD
