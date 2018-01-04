const express = require('express')
let app = express()
let http = require('http').Server(app);
let io = require('socket.io')(http);


http.listen(3000, function(){
    console.log('listening on *:3000');
});

app.use(express.static('public'));

let playersArray = [];
let currentSeekTime = 0;
let currentArrayBuffer = [];

io.on('connection', function(socket){

    socket.on('add_new_player', function () {
        //For browser reloads
        removeLostConnections();

        let newSocketItem = {
            socket: socket,
            buffer: currentArrayBuffer.slice()
        };
        playersArray.push(newSocketItem);

        while(newSocketItem.buffer.length > 0){
            newSocketItem.socket.emit('chunk_in', newSocketItem.buffer.shift());
        }
    });

    socket.on('chunk_in', function (chunk) {
        playersArray.forEach((socketItem) => {
            if(socketItem.buffer.length === 0){
                socketItem.socket.emit('chunk_in', chunk);
            }else{
                socketItem.buffer.push(chunk);
            }
        });

        currentArrayBuffer.push(chunk);
    });
    socket.on('source_seek_time', function (time) {
        currentSeekTime = time.time;
        removePlayedChunks();
        multicast('source_seek_time', time);
    });

    socket.on('new_stream', function () {
        removeLostConnections();
        multicast('new_stream', {});
        currentArrayBuffer = [];
        playersArray.forEach((socketItem) => {
            socketItem.buffer = [];
        });
    });

});


function removeLostConnections(){
    playersArray = playersArray.filter((it) => it.socket.connected);
}

function removePlayedChunks(){
    currentArrayBuffer = currentArrayBuffer.filter((it) => it.id > currentSeekTime)
}

function multicast(event, value){
    playersArray.forEach(socketIt => socketIt.socket.emit(event, value));
}
