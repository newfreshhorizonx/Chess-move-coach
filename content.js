const coach = document.createElement("div");

coach.innerHTML = `
  <strong>♟ Chess Move Coach</strong>
  <div>Training Mode</div>
  <div id="coach-status">Checking game...</div>
  <div id="coach-fen" style="margin-top:8px; font-size:11px; word-break:break-all;"></div>
  <div id="coach-your-move" style="margin-top:10px; padding-top:8px; border-top:1px solid #ddd; font-size:13px;"></div>
  <div id="coach-opponent-move" style="margin-top:6px; font-size:13px;"></div>
`;

coach.style.position = "fixed";
coach.style.top = "20px";
coach.style.right = "20px";
coach.style.zIndex = "999999";
coach.style.background = "white";
coach.style.color = "black";
coach.style.padding = "15px";
coach.style.borderRadius = "10px";
coach.style.fontFamily = "Arial, sans-serif";
coach.style.fontSize = "14px";
coach.style.maxWidth = "300px";
coach.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";

document.body.appendChild(coach);


function getPlayerColor() {
  const wraps = document.querySelectorAll(".cg-wrap");

  for (let i = 0; i < wraps.length; i++) {
    const wrap = wraps[i];

    if (wrap.closest(".round__app__board")) {
      if (wrap.classList.contains("orientation-black")) {
        return "black";
      }
      return "white";
    }
  }

  if (wraps.length > 0) {
    if (wraps[0].classList.contains("orientation-black")) {
      return "black";
    }
    return "white";
  }

  return "white";
}


function getSideToMoveIsWhite() {
  const whiteClock = document.querySelector(".rclock-white");
  const blackClock = document.querySelector(".rclock-black");

  if (whiteClock && whiteClock.classList.contains("running")) {
    return true;
  }

  if (blackClock && blackClock.classList.contains("running")) {
    return false;
  }

  return null;
}


function getBoardPosition() {
  const board = document.querySelector("cg-board");

  if (!board) {
    return [];
  }

  const pieces = board.querySelectorAll("piece");

  const position = [];

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

  const pieceLetters = {
    pawn: "P",
    knight: "N",
    bishop: "B",
    rook: "R",
    queen: "Q",
    king: "K"
  };

  const boardSize = board.getBoundingClientRect().width;

  if (!boardSize) {
    return [];
  }

  const squareSize = boardSize / 8;
  const isFlipped = getPlayerColor() === "black";

  pieces.forEach((piece) => {
    const classAttribute = piece.getAttribute("class");

    if (!classAttribute) {
      return;
    }

    const classes = classAttribute.split(" ");

    const color = classes[0];
    const type = classes[1];

    if (!pieceLetters[type]) {
      return;
    }

    const transform = piece.style.transform;

    const match = transform.match(
      /translate\(([\d.]+)px,\s*([\d.]+)px\)/
    );

    if (!match) {
      return;
    }

    const x = Number(match[1]);
    const y = Number(match[2]);

    let fileIndex = Math.round(x / squareSize);
    let rank = 8 - Math.round(y / squareSize);

    if (isFlipped) {
      fileIndex = 7 - fileIndex;
      rank = 9 - rank;
    }

    if (
      fileIndex < 0 ||
      fileIndex > 7 ||
      rank < 1 ||
      rank > 8
    ) {
      return;
    }

    const square = files[fileIndex] + rank;

    position.push({
      piece:
        color === "white"
          ? pieceLetters[type]
          : pieceLetters[type].toLowerCase(),

      square: square
    });
  });

  return position;
}


function positionToFEN(position) {
  const board = {};

  position.forEach((item) => {
    board[item.square] = item.piece;
  });

  const ranks = [];

  for (let rank = 8; rank >= 1; rank--) {
    let fenRank = "";
    let emptySquares = 0;

    for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
      const file = String.fromCharCode(97 + fileIndex);
      const square = file + rank;

      if (board[square]) {
        if (emptySquares > 0) {
          fenRank += emptySquares;
          emptySquares = 0;
        }

        fenRank += board[square];
      } else {
        emptySquares++;
      }
    }

    if (emptySquares > 0) {
      fenRank += emptySquares;
    }

    ranks.push(fenRank);
  }

  return ranks.join("/");
}


function getCastlingRights(position) {
  const map = {};

  position.forEach((item) => {
    map[item.square] = item.piece;
  });

  let rights = "";

  if (map["e1"] === "K") {
    if (map["h1"] === "R") rights += "K";
    if (map["a1"] === "R") rights += "Q";
  }

  if (map["e8"] === "k") {
    if (map["h8"] === "r") rights += "k";
    if (map["a8"] === "r") rights += "q";
  }

  return rights || "-";
}


function uciToReadable(uciMove, position) {
  if (!uciMove || uciMove.length < 4) {
    return uciMove;
  }

  const from = uciMove.substring(0, 2);
  const to = uciMove.substring(2, 4);
  const promotion = uciMove.length > 4 ? uciMove.substring(4, 5).toUpperCase() : null;

  const map = {};
  position.forEach((item) => {
    map[item.square] = item.piece;
  });

  const movingPiece = map[from];

  if (!movingPiece) {
    return uciMove + " (" + from + " → " + to + ")";
  }

  const pieceType = movingPiece.toUpperCase();
  const isCapture = !!map[to];

  if (pieceType === "K") {
    if (from === "e1" && to === "g1") return "O-O";
    if (from === "e1" && to === "c1") return "O-O-O";
    if (from === "e8" && to === "g8") return "O-O";
    if (from === "e8" && to === "c8") return "O-O-O";
  }

  let notation = "";

  if (pieceType === "P") {
    notation = isCapture ? from[0] + "x" + to : to;

    if (promotion) {
      notation += "=" + promotion;
    }
  } else {
    notation = pieceType + (isCapture ? "x" : "") + to;
  }

  return notation + " (" + from + " → " + to + ")";
}


let plyCount = 0;
let lastKnownSideToMoveIsWhite = true;


function buildFullFEN(boardFEN, position, sideToMoveIsWhite) {
  const sideToMove = sideToMoveIsWhite ? "w" : "b";
  const castling = getCastlingRights(position);
  const enPassant = "-";
  const halfmoveClock = "0";
  const fullmoveNumber = Math.floor(plyCount / 2) + 1;

  return `${boardFEN} ${sideToMove} ${castling} ${enPassant} ${halfmoveClock} ${fullmoveNumber}`;
}


function isGamePage() {
  return document.querySelector(".round__app__board .cg-wrap") !== null;
}


function isGameFinished() {
  const status = document.querySelector(".game__meta .status");

  if (!status) {
    return false;
  }

  const text = status.textContent.toLowerCase();

  return (
    text.includes("resigned") ||
    text.includes("victorious") ||
    text.includes("draw") ||
    text.includes("aborted") ||
    text.includes("timeout") ||
    text.includes("checkmate")
  );
}


let lastPosition = "";
let analysisInFlight = false;
let queuedRequest = null;
let pendingCheckTimeout = null;
let requestCounter = 0;
let latestRequestId = 0;


function updateTurnHighlighting() {
  const yourMoveDisplay = document.getElementById("coach-your-move");
  const opponentMoveDisplay = document.getElementById("coach-opponent-move");

  const playerColor = getPlayerColor();
  const sideToMoveIsWhite = getSideToMoveIsWhite();

  if (sideToMoveIsWhite === null) {
    return;
  }

  const isCurrentlyPlayersTurn =
    (playerColor === "white" && sideToMoveIsWhite) ||
    (playerColor === "black" && !sideToMoveIsWhite);

  if (yourMoveDisplay) {
    yourMoveDisplay.style.opacity = isCurrentlyPlayersTurn ? "1" : "0.4";
  }

  if (opponentMoveDisplay) {
    opponentMoveDisplay.style.opacity = isCurrentlyPlayersTurn ? "0.4" : "1";
  }
}


function requestBestMove(fen, wasWhiteToMove, position, moveNumber) {
  const requestId = ++requestCounter;
  latestRequestId = requestId;

  const playerColor = getPlayerColor();
  const isPlayersTurn =
    (playerColor === "white" && wasWhiteToMove) ||
    (playerColor === "black" && !wasWhiteToMove);

  const yourMoveDisplay = document.getElementById("coach-your-move");
  const opponentMoveDisplay = document.getElementById("coach-opponent-move");

  if (isPlayersTurn && yourMoveDisplay) {
    yourMoveDisplay.textContent = "Your move: thinking...";
  } else if (!isPlayersTurn && opponentMoveDisplay) {
    opponentMoveDisplay.textContent = "Opponent's move: thinking...";
  }

  if (analysisInFlight) {
    queuedRequest = { fen: fen, wasWhiteToMove: wasWhiteToMove, position: position, requestId: requestId, moveNumber: moveNumber };
    return;
  }

  analysisInFlight = true;
  runAnalysis(fen, wasWhiteToMove, position, requestId, moveNumber);
}


function runAnalysis(fen, wasWhiteToMove, position, requestId, moveNumber) {
  chrome.runtime.sendMessage(
    { target: "offscreen", payload: { type: "ANALYZE", fen: fen } },
    function (response) {
      analysisInFlight = false;

      if (requestId === latestRequestId) {
        const playerColor = getPlayerColor();
        const isPlayersTurn =
          (playerColor === "white" && wasWhiteToMove) ||
          (playerColor === "black" && !wasWhiteToMove);

        const yourMoveDisplay = document.getElementById("coach-your-move");
        const opponentMoveDisplay = document.getElementById("coach-opponent-move");

        const bestMoveRaw =
          response && response.bestMove ? response.bestMove : null;

        let readableMove;

        if (bestMoveRaw === "(none)") {
          readableMove = "No legal moves (checkmate/stalemate)";
        } else if (bestMoveRaw) {
          readableMove = uciToReadable(bestMoveRaw, position);
        } else {
          readableMove = null;
        }

        const label = readableMove ? readableMove : "no suggestion";
        const moveTag = "(move " + moveNumber + ")";

        if (isPlayersTurn && yourMoveDisplay) {
          yourMoveDisplay.textContent = "Your move " + moveTag + ": " + label;
        } else if (!isPlayersTurn && opponentMoveDisplay) {
          opponentMoveDisplay.textContent = "Opponent's move " + moveTag + ": " + label;
        }

        updateTurnHighlighting();

        console.log("Chess Move Coach: best move =", readableMove);
      } else {
        console.log("Chess Move Coach: discarding superseded analysis result");
      }

      if (queuedRequest) {
        const next = queuedRequest;
        queuedRequest = null;
        analysisInFlight = true;
        runAnalysis(next.fen, next.wasWhiteToMove, next.position, next.requestId, next.moveNumber);
      }
    }
  );
}


function updateBoard() {
  const status = document.getElementById("coach-status");
  const fenDisplay = document.getElementById("coach-fen");

  if (!status || !fenDisplay) {
    return;
  }

  if (!isGamePage()) {
    status.textContent = "Waiting for a game...";
    fenDisplay.textContent = "";
    return;
  }

  if (isGameFinished()) {
    status.textContent = "Game finished";
    fenDisplay.textContent = "";
    return;
  }

  const position = getBoardPosition();

  if (position.length === 0) {
    status.textContent = "Reading game...";
    fenDisplay.textContent = "";
    return;
  }

  const currentPosition = JSON.stringify(position);

  if (currentPosition !== lastPosition) {
    status.textContent = `${position.length} pieces detected (settling...)`;

    if (pendingCheckTimeout) {
      clearTimeout(pendingCheckTimeout);
    }

    pendingCheckTimeout = setTimeout(function () {
      confirmAndAnalyze(currentPosition);
    }, 250);
  } else {
    updateTurnHighlighting();
  }
}


function confirmAndAnalyze(snapshotAtScheduleTime) {
  const position = getBoardPosition();

  if (position.length === 0) {
    return;
  }

  const currentPosition = JSON.stringify(position);

  if (currentPosition !== snapshotAtScheduleTime) {
    return;
  }

  if (currentPosition === lastPosition) {
    return;
  }

  lastPosition = currentPosition;
  plyCount++;

  let sideToMoveIsWhite = getSideToMoveIsWhite();

  if (sideToMoveIsWhite === null) {
    sideToMoveIsWhite = !lastKnownSideToMoveIsWhite;
  }

  lastKnownSideToMoveIsWhite = sideToMoveIsWhite;

  const boardFEN = positionToFEN(position);
  const fullFEN = buildFullFEN(boardFEN, position, sideToMoveIsWhite);
  const moveNumber = Math.floor(plyCount / 2) + 1;

  const status = document.getElementById("coach-status");
  const fenDisplay = document.getElementById("coach-fen");

  if (status) {
    status.textContent = `${position.length} pieces detected`;
  }

  if (fenDisplay) {
    fenDisplay.textContent = `FEN: ${fullFEN}`;
  }

  updateTurnHighlighting();

  console.log("Position changed:", position);
  console.log("Full FEN:", fullFEN);

  requestBestMove(fullFEN, sideToMoveIsWhite, position, moveNumber);
}


updateBoard();

setInterval(updateBoard, 1000);