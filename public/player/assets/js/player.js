'use strict';


var mediaPlayer = document.querySelector('audio');
const mimeCodec = 'audio/mpeg;';



var sourceBuffer;
var queue = [];
queue.push = function( buffer ) {
    if (buffer !== 'done' && !sourceBuffer.updating && this.length === 0 ) {
        sourceBuffer.appendBuffer( buffer )
    } else {
        Array.prototype.push.call( this, buffer )
    }
};

if ('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)) {
    let mediaSource = new MediaSource;
    mediaPlayer.src = URL.createObjectURL(mediaSource);
    mediaSource.addEventListener('sourceopen', sourceOpen);
} else {
    console.error('Unsupported MIME type or codec: ', mimeCodec);
}

function sourceOpen (_) {
    let mediaSource = this;
    sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
    sourceBuffer.addEventListener('updateend', function (_) {

        if ( queue.length > 0 ) {
            var nextElement = queue.shift();
            if (nextElement === 'done'){
                mediaSource.endOfStream();
            }else{
                sourceBuffer.appendBuffer(nextElement);
            }
        }
        mediaPlayer.play();

    });

    fetchAB(function (buf) {
        queue.push(buf);
    }, function(){
        queue.push('done');
    });

}

function fetchAB (update, done) {
    let socket = io();
    socket.emit('add_new_player', {});
    socket.on('chunk_in', function(chunk){
        update(chunk);
    });
    socket.on('chunk_end', function(){
        done();
    });
}

