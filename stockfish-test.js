console.log("Chess Move Coach: sending PING to engine...");

chrome.runtime.sendMessage(
  { target: "offscreen", payload: "PING" },
  function (response) {
    console.log("Chess Move Coach: engine responded with:", response);
  }
);