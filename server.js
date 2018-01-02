const express = require('express')
let app = express()
let http = require('http').Server(app);
let io = require('socket.io')(http);
let fs = require('fs');


http.listen(3000, function(){
    console.log('listening on *:3000');
});

app.use(express.static('public'));

let playersArray = [];

io.on('connection', function(socket){
    console.log('a user connected');

    socket.on('add_new_player', function () {
        playersArray.push(socket);
    });

    socket.on('chunk_in', function (chunk) {
        multicastChunk(chunk);
    });
    socket.on('chunk_end', function () {
        multicastChunkEnd();
    });
});

function multicastChunk(chunk){
    playersArray.forEach(socketIt => socketIt.emit('chunk_in', chunk));
}

function multicastChunkEnd(){
    playersArray.forEach(socketIt => socketIt.emit('chunk_end'));

}




//Simulate input from server
/*setTimeout(()=>{
    generateInput(multicastChunk, multicastChunkEnd);
}, 5000);*/

function generateInput(onDataFn, onEndFn) {
    let readStream = fs.createReadStream('./public/player/assets/frag_bunny.mp4');
    readStream.on('data', onDataFn);
    readStream.on('end', onEndFn);
}