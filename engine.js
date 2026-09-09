console.log("Engine page started");

const stockfishURL = chrome.runtime.getURL(
  "stockfish/stockfish-18-lite-single.js"
);

console.log("Stockfish URL:", stockfishURL);

const engine = new Worker(stockfishURL);

let currentResolve = null;
let lastScoreInfo = null;

engine.onmessage = function (event) {
  const line = event.data;
  console.log("STOCKFISH:", line);

  if (typeof line === "string" && line.startsWith("info") && line.includes("score")) {
    lastScoreInfo = line;
  }

  if (typeof line === "string" && line.startsWith("bestmove")) {
    const parts = line.split(" ");
    const bestMove = parts[1];

    if (currentResolve) {
      currentResolve({ bestMove: bestMove, scoreInfo: lastScoreInfo });
      currentResolve = null;
    }
  }
};

engine.onerror = function (event) {
  console.error("STOCKFISH WORKER ERROR:", event);

  if (currentResolve) {
    currentResolve(null);
    currentResolve = null;
  }
};

console.log("Stockfish worker created, sending uci...");

engine.postMessage("uci");


chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.target !== "engine") {
    return;
  }

  const payload = message.payload;

  if (payload === "PING") {
    sendResponse("PONG");
    return;
  }

  if (payload && payload.type === "ANALYZE" && payload.fen) {
    lastScoreInfo = null;
    currentResolve = sendResponse;

    engine.postMessage("position fen " + payload.fen);
    engine.postMessage("go depth 12");

    return true;
  }
});