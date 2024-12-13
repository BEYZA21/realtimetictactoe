const express = require("express");
const app = express();
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.resolve("")));

let rooms = {}; // Odaları tutan nesne

io.on("connection", (socket) => {
  console.log("A user connected");

  // Kullanıcı bir oda aradığında
  socket.on("find", (e) => {
    if (e.name) {
      let roomId = findAvailableRoom();

      if (!roomId) {
        // Yeni bir oda oluştur
        roomId = `room-${Object.keys(rooms).length + 1}`;
        rooms[roomId] = {
          players: [],
          gameData: {
            sum: 1,
            p1: null,
            p2: null,
            currentTurn: "X", // Sıra başlangıçta X oyuncusunda
          },
        };
      }

      // Kullanıcıyı odaya ekle
      socket.join(roomId);
      rooms[roomId].players.push({ id: socket.id, name: e.name });

      console.log(`${e.name} joined ${roomId}`);

      // Odaya bağlı kullanıcı sayısını kontrol et
      if (rooms[roomId].players.length === 2) {
        const [player1, player2] = rooms[roomId].players;
        rooms[roomId].gameData.p1 = {
          p1name: player1.name,
          p1value: "X",
          p1move: "",
        };
        rooms[roomId].gameData.p2 = {
          p2name: player2.name,
          p2value: "O",
          p2move: "",
        };

        // Oyunculara oyunun başladığını gönder
        io.to(roomId).emit("find", {
          allPlayers: [rooms[roomId].gameData],
        });
      }
    }
  });

  // Hamle yapıldığında
  socket.on("playing", (e) => {
    const roomId = findPlayerRoom(socket.id);

    if (roomId) {
      const gameData = rooms[roomId].gameData;

      // Sadece sıradaki oyuncu hamle yapabilir
      if (
        (gameData.currentTurn === "X" && e.value === "X") ||
        (gameData.currentTurn === "O" && e.value === "O")
      ) {
        if (e.value === "X") {
          gameData.p1.p1move = e.id;
          gameData.sum++;
          gameData.currentTurn = "O"; // Sırayı değiştir
        } else if (e.value === "O") {
          gameData.p2.p2move = e.id;
          gameData.sum++;
          gameData.currentTurn = "X"; // Sırayı değiştir
        }

        // Hamle bilgilerini odadaki tüm kullanıcılara gönder
        io.to(roomId).emit("playing", {
          allPlayers: [gameData],
        });
      } else {
        // Yanlış sırada hamle yapılırsa oyuncuya hata mesajı gönder
        socket.emit("error", {
          message: "It's not your turn!",
        });
      }
    }
  });

  // Oyun bittiğinde
  socket.on("gameOver", (e) => {
    const roomId = findPlayerRoom(socket.id);

    if (roomId) {
      delete rooms[roomId]; // Odayı temizle
      console.log(`Room ${roomId} has been removed`);
    }
  });

  // Kullanıcı bağlantısını kestiğinde
  socket.on("disconnect", () => {
    const roomId = findPlayerRoom(socket.id);

    if (roomId) {
      rooms[roomId].players = rooms[roomId].players.filter(
        (player) => player.id !== socket.id
      );

      if (rooms[roomId].players.length === 0) {
        delete rooms[roomId]; // Odayı temizle
        console.log(`Room ${roomId} has been removed`);
      }
    }

    console.log("A user disconnected");
  });
});

// Boş oda bul
function findAvailableRoom() {
  return Object.keys(rooms).find(
    (roomId) => rooms[roomId].players.length < 2
  );
}

// Kullanıcının hangi odada olduğunu bul
function findPlayerRoom(socketId) {
  return Object.keys(rooms).find((roomId) =>
    rooms[roomId].players.some((player) => player.id === socketId)
  );
}

app.get("/", (req, res) => {
  return res.sendFile(path.resolve("index.html"));
});

// Render'da PORT ayarı
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
