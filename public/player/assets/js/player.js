'use strict';

let mediaPlayer = document.querySelector('audio');
const mimeCodec = 'audio/mpeg;';

let offSetPosition;
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
        setOffSet(chunk.id);
        update(chunk);
    });
    socket.on('chunk_end', function(){
        done();
    });
    socket.on('source_seek_time', function(source_seek){
        let latency = ((new Date().getTime()) - source_seek.timeStamp) / 1000;
        if(offSetPosition != null && source_seek.time - (mediaPlayer.currentTime + offSetPosition) > latency){
            playOnce();
            mediaPlayer.currentTime = ((source_seek.time - offSetPosition) + latency) + 0.5;
        }
    });
}

function once(fn) {
    var result;

    return function() {
        if(fn) {
            result = fn.apply(this, arguments);
            fn = null;
        }

        return result;
    };
}

let playOnce = once(function(){
    mediaPlayer.play();
});
let setOffSet = once(function(offSet){
    offSetPosition = offSet;
});


