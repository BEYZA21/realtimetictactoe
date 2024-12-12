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

io.on("connection", (socket) => {
  socket.on("find", (e) => {
    if (e.name != null) {
      arr.push(e.name);

      if (arr.length >= 2) {
        let p1obj = {
          p1name: arr[0],
          p1value: "X",
          p1move: "",
        };
        let p2obj = {
          p2name: arr[1],
          p2value: "O",
          p2move: "",
        };

        let obj = {
          p1: p1obj,
          p2: p2obj,
          sum: 1,
          turn: "X", // Sıra X'ten başlar
        };
        playingArray.push(obj);

        arr.splice(0, 2);

        io.emit("find", { allPlayers: playingArray });
      }
    }
  });

  socket.on("playing", (e) => {
    let objToChange = playingArray.find(
      (obj) => obj.p1.p1name === e.name || obj.p2.p2name === e.name
    );

    if (objToChange) {
      // Sıra kontrolü
      if (objToChange.turn === e.value) {
        if (e.value == "X") {
          objToChange.p1.p1move = e.id;
          objToChange.turn = "O"; // Sıra O'ya geçer
        } else if (e.value == "O") {
          objToChange.p2.p2move = e.id;
          objToChange.turn = "X"; // Sıra X'e geçer
        }
        objToChange.sum++;

        // Hamle bilgilerini tüm oyunculara gönder
        io.emit("playing", { allPlayers: playingArray });
      } else {
        // Sıra yanlış oyuncuda
        socket.emit("error", { message: "Sıra sizde değil!" });
      }
    }
  });

  socket.on("gameOver", (e) => {
    playingArray = playingArray.filter((obj) => obj.p1.p1name !== e.name);
    console.log(playingArray);
    console.log("Game Over");
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
