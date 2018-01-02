const express = require('express')
let app = express()
let http = require('http').Server(app);
let io = require('socket.io')(http);


http.listen(3000, function(){
    console.log('listening on *:3000');
});

app.use(express.static('public'));

let playersArray = [];

io.on('connection', function(socket){
    console.log('a user connected');

    socket.on('add_new_player', function () {
        playersArray.push(socket);
        playersArray.forEach(it => console.log(it.id))
    });

    socket.on('chunk_in', function (chunk) {
        multicastChunk(chunk);
    });
    socket.on('chunk_end', function () {
        multicastChunkEnd();
    });

});

function multicastChunk(chunk){
    playersArray = playersArray.filter((it) => it.connected);
    playersArray.forEach(socketIt => {
        if(socketIt.connected){
            console.log('Sending chunk to: ' + socketIt.id);
            socketIt.emit('chunk_in', chunk)
        }
    });
}

function multicastChunkEnd(){
    playersArray = playersArray.filter((it) => it.connected);
    playersArray.forEach(socketIt => socketIt.emit('chunk_end'));
}