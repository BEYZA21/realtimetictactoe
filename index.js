const express = require("express");
const app = express();

const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server);
app.use(express.static(path.resolve("")));

let arr = [];
let playingArray = [];

// Kazanma kombinasyonları
const winConditions = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

// Kazananı kontrol etme fonksiyonu
function checkWinner(board) {
  for (let condition of winConditions) {
    const [a, b, c] = condition;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // X veya O döner
    }
  }
  return null; // Kazanan yok
}

io.on("connection", (socket) => {
  socket.on("find", (e) => {
    if (e.name != null) {
      arr.push(e.name);

      if (arr.length >= 2) {
        let obj = {
          p1: {
            name: arr[0],
            value: "X",
          },
          p2: {
            name: arr[1],
            value: "O",
          },
          board: Array(9).fill(null), // 3x3 tahtayı temsil eder
          turn: "X", // Başlangıçta sıra X'te
          winner: null,
        };
        playingArray.push(obj);

        arr.splice(0, 2);

        io.emit("find", { allPlayers: playingArray });
      }
    }
  });

  socket.on("playing", (e) => {
    let game = playingArray.find(
      (obj) => obj.p1.name === e.name || obj.p2.name === e.name
    );

    if (game && !game.winner) {
      // Sıra kontrolü
      if (game.turn === e.value) {
        if (!game.board[e.index]) {
          game.board[e.index] = e.value; // Hamle yap
          game.turn = e.value === "X" ? "O" : "X"; // Sırayı değiştir

          // Kazananı kontrol et
          const winner = checkWinner(game.board);
          if (winner) {
            game.winner = winner;
            io.emit("winner", { winner, game });
          } else if (game.board.every((cell) => cell)) {
            io.emit("draw", { message: "Oyun berabere!" });
          } else {
            io.emit("playing", { allPlayers: playingArray });
          }
        } else {
          socket.emit("error", { message: "Bu hücre zaten dolu!" });
        }
      } else {
        socket.emit("error", { message: "Sıra sizde değil!" });
      }
    }
  });

  socket.on("gameOver", (e) => {
    playingArray = playingArray.filter(
      (obj) => obj.p1.name !== e.name && obj.p2.name !== e.name
    );
  });
});

app.get("/", (req, res) => {
  return res.sendFile(path.resolve("index.html"));
});

// Render'da PORT ayarı
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
