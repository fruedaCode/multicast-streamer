const express = require('express')
let app = express()
let http = require('http').Server(app);
let io = require('socket.io')(http);


http.listen(3000, function(){
    console.log('listening on *:3000');
});

app.use(express.static('public'));

let playersArray = [];
let currentArrayBuffer = [];
let currentSeekTime = 0;

io.on('connection', function(socket){
    console.log('a user connected');

    socket.on('add_new_player', function () {
        playersArray = playersArray.filter((it) => it.connected);
        playersArray.push(socket);

        console.log(JSON.stringify(currentArrayBuffer));
        currentArrayBuffer.forEach((chunk) => {
            multicast('chunk_in', chunk);
        });
    });

    socket.on('chunk_in', function (chunk) {
        currentArrayBuffer.push(chunk);
    });
    socket.on('source_seek_time', function (time) {
        currentSeekTime = time.time;
        removePlayedChunks();
        multicast('source_seek_time', time);
    });
    socket.on('new_stream', function () {
        currentArrayBuffer = [];
        multicast('new_stream', {});
    });

});

function removePlayedChunks(){
    currentArrayBuffer = currentArrayBuffer.filter((it) => it.id > currentSeekTime)
}

function multicast(event, value){
    playersArray.forEach(socketIt => socketIt.emit(event, value));
}
