async function ensureOffscreenDocument() {
  const existing = await chrome.offscreen.hasDocument();

  if (existing) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: "engine.html",
    reasons: ["WORKERS"],
    justification: "Run Stockfish in a Web Worker for move analysis"
  });

  console.log("Offscreen document created");
}

chrome.runtime.onInstalled.addListener(ensureOffscreenDocument);
chrome.runtime.onStartup.addListener(ensureOffscreenDocument);

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.target === "offscreen") {
    ensureOffscreenDocument().then(function () {
      chrome.runtime.sendMessage(
        { target: "engine", payload: message.payload },
        function (response) {
          sendResponse(response);
        }
      );
    });

    return true;
  }
});