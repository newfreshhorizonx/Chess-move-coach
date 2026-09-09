const coach = document.createElement("div");

coach.innerHTML = `
  <strong>♟ Chess Move Coach</strong>
  <div>Training Mode</div>
  <div id="coach-status">Checking game...</div>
  <div id="coach-fen" style="margin-top:8px; font-size:11px; word-break:break-all;"></div>
  <div id="coach-your-move" style="margin-top:10px; padding-top:8px; border-top:1px solid #ddd; font-size:13px;"></div>
  <div id="coach-opponent-move" style="margin-top:6px; font-size:13px; color:#555;"></div>
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
  const wrap = document.querySelector(".cg-wrap");

  if (!wrap) {
    return "white";
  }

  if (wrap.classList.contains("orientation-black")) {
    return "black";
  }

  return "white";
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


let sideToMoveIsWhite = true;
let plyCount = 0;
let isFirstDetection = true;


function buildFullFEN(boardFEN, position) {
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
let pendingCheckTimeout = null;


function requestBestMove(fen, wasWhiteToMove, position) {
  if (analysisInFlight) {
    return;
  }

  analysisInFlight = true;

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

  chrome.runtime.sendMessage(
    { target: "offscreen", payload: { type: "ANALYZE", fen: fen } },
    function (response) {
      analysisInFlight = false;

      const bestMoveRaw =
        response && response.bestMove ? response.bestMove : null;

      const readableMove = bestMoveRaw
        ? uciToReadable(bestMoveRaw, position)
        : null;

      if (isPlayersTurn && yourMoveDisplay) {
        yourMoveDisplay.textContent = readableMove
          ? "Your move: " + readableMove
          : "Your move: no suggestion";
      } else if (!isPlayersTurn && opponentMoveDisplay) {
        opponentMoveDisplay.textContent = readableMove
          ? "Opponent's move: " + readableMove
          : "Opponent's move: no suggestion";
      }

      console.log("Chess Move Coach: best move =", readableMove);
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

  if (!isFirstDetection) {
    plyCount++;
    sideToMoveIsWhite = !sideToMoveIsWhite;
  }

  isFirstDetection = false;

  lastPosition = currentPosition;

  const boardFEN = positionToFEN(position);
  const fullFEN = buildFullFEN(boardFEN, position);

  const status = document.getElementById("coach-status");
  const fenDisplay = document.getElementById("coach-fen");

  if (status) {
    status.textContent = `${position.length} pieces detected`;
  }

  if (fenDisplay) {
    fenDisplay.textContent = `FEN: ${fullFEN}`;
  }

  console.log("Position changed:", position);
  console.log("Full FEN:", fullFEN);

  requestBestMove(fullFEN, sideToMoveIsWhite, position);
}


updateBoard();

setInterval(updateBoard, 1000);