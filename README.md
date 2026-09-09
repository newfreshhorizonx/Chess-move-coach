# ♟ Chess Move Coach

A browser extension for [Lichess](https://lichess.org) that reads the board directly from the page and runs [Stockfish](https://stockfishchess.org/) locally in the browser — free, unlimited computer analysis, no premium subscription required.

Built after switching from Chess.com to Lichess specifically to get this. Idea inspired by **Nebil Soussi**, who I'm building this with.

## What it does

- Detects the Lichess board and pieces directly from the page (no API calls, no external services)
- Reconstructs the position as a FEN string, including side to move, castling rights, and move count
- Runs a full local copy of Stockfish 18 (Lite, single-threaded WASM build) inside the extension
- Shows a live suggested move for both sides, in readable notation (e.g. `Nb6`, `O-O`, `exd5`) alongside the raw squares

## Status

This is an early, working prototype — not yet published to the Chrome Web Store. Currently:

- ✅ Board detection, FEN generation, and orientation handling (works whether you're playing White or Black)
- ✅ Local Stockfish analysis via a Manifest V3 offscreen document + Web Worker
- ✅ Move suggestions in both UCI and readable notation
- ⚠️ Castling rights are inferred heuristically (based on king/rook starting squares still being occupied), not tracked precisely
- ⚠️ En passant is not yet detected
- ⚠️ No move disambiguation yet for identical pieces that could both reach the same square (rare edge case)
- 🚧 Training mode / pre-move blunder checking — planned, not yet built

## Running it locally

This project intentionally has no build step — no Node, no npm, just plain JS.

1. Clone the repo:
   ```bash
   git clone https://github.com/newfreshhorizonx/Chess-move-coach.git
   ```
2. Open `chrome://extensions` in Chrome (or any Chromium-based browser, e.g. Vivaldi, Edge).
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the cloned `chess-move-coach` folder.
5. Open any game on [lichess.org](https://lichess.org) — the coach panel appears top-right.

## Architecture

```
Lichess content script (content.js)
        ↓ detects board, builds FEN
background.js (service worker)
        ↓ manages an offscreen document
engine.html + engine.js
        ↓ runs Stockfish in a Web Worker
stockfish/ (Stockfish 18 Lite, single-threaded WASM)
        ↓ returns best move via UCI
back to content.js → displayed in the panel
```

Stockfish is loaded via `fetch()` + Blob URL rather than a direct `chrome-extension://` worker URL, which is more reliable across Chromium extension contexts.

## License

Stockfish itself is GPL-3.0. This extension's own code is not yet licensed — treat as all-rights-reserved for now unless stated otherwise.
