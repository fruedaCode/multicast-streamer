const express = require('express')
let app = express()
let http = require('http').Server(app);
let io = require('socket.io')(http);


http.listen(3000, function(){
    console.log('listening on *:3000');
});

app.use(express.static('public'));

let playersArray = [];
let totalSize = 0;

io.on('connection', function(socket){
    console.log('a user connected');

    socket.on('add_new_player', function () {
        playersArray = playersArray.filter((it) => it.connected);
        playersArray.push(socket);
        multicast('total_size', totalSize);
        playersArray.forEach(it => console.log(it.id));
    });

    socket.on('chunk_in', function (chunk) {
        multicast('chunk_in', chunk);
    });
    socket.on('chunk_end', function () {
        multicast('chunk_end', {});
    });
    socket.on('source_seek_time', function (time) {
        multicast('source_seek_time', time);
    });
    socket.on('total_size', function (size) {
        totalSize = size;
        multicast('total_size', totalSize);
    });

});

function multicast(event, value){
    playersArray.forEach(socketIt => socketIt.emit(event, value));
}
