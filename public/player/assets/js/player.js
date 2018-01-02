'use strict';

let mediaPlayer = document.querySelector('audio');
const mimeCodec = 'audio/mpeg;';

let offSetPosition = -1;
let sourceBuffer;
let queue = [];
queue.push = function( chunk ) {
    if (chunk !== 'done' && !sourceBuffer.updating) {
        sourceBuffer.appendBuffer( chunk.data )
    } else {
        Array.prototype.push.call( this, chunk )
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
            let chunk = queue.shift();
            if (chunk === 'done'){
                mediaSource.endOfStream();
            }else{
                sourceBuffer.appendBuffer(chunk.data);
            }
        }

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
        if(offSetPosition === -1){
            offSetPosition = chunk.id;
            console.log('OffsetPosition: ' + offSetPosition);
        }
        update(chunk);
    });
    socket.on('chunk_end', function(){
        done();
    });
    socket.on('source_seek_time', function(source_seek_time){
        console.log('SeekTime:' + source_seek_time);
        console.log('CurrentTime:' + mediaPlayer.currentTime);
        if(offSetPosition > -1 && source_seek_time - (mediaPlayer.currentTime + offSetPosition) > 0.5){
            console.log('play!!');
            mediaPlayer.currentTime = (source_seek_time - offSetPosition) + 0.5;
            mediaPlayer.play();
        }
    });
}

