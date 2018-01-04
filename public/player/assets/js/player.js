'use strict';

let mediaPlayer;
const mimeCodec = 'audio/mpeg;';
let socket = io();

let offSetPosition;
let sourceBuffer;
let queue = newQueue();

createMediaPlayer();
socket.on('new_stream', function(){
    createMediaPlayer();
});

function createMediaPlayer(){
    if(mediaPlayer){
        mediaPlayer.remove();
    }
    queue = newQueue();

    mediaPlayer = document.createElement('audio');
    mediaPlayer.setAttribute('controls','');
    document.querySelector('body').appendChild(mediaPlayer);

    if ('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)) {
        let mediaSource = new MediaSource;
        mediaPlayer.src = URL.createObjectURL(mediaSource);
        mediaSource.addEventListener('sourceopen', sourceOpen);
    } else {
        console.error('Unsupported MIME type or codec: ', mimeCodec);
    }
}

function sourceOpen () {
    let mediaSource = this;
    sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
    sourceBuffer.addEventListener('updateend', function (_) {
        if ( queue.length > 0 ) {
            let chunk = queue.shift();
            sourceBuffer.appendBuffer(chunk.data);
        }

    });

    fetchAB(function (buf) {
        queue.push(buf);
    });

}

function fetchAB (update) {

    let playOnce = once(function(){
        mediaPlayer.play();
    });
    let setOffSet = once(function(offSet){
        offSetPosition = offSet;
    });

    socket.removeListener('chunk_in');
    socket.removeListener('source_seek_time');
    subscribePlayer();

    socket.on('chunk_in', function(chunk){
        setOffSet(chunk.id);
        update(chunk);
    });

    socket.on('source_seek_time', function(source_seek){
        let latency = ((new Date().getTime()) - source_seek.timeStamp) / 1000;
        if(offSetPosition != null && source_seek.time - (mediaPlayer.currentTime + offSetPosition) > latency){
            playOnce();
            mediaPlayer.currentTime = ((source_seek.time - offSetPosition) + latency) + 0.05;
        }
    });
}

let subscribePlayer = once(function(offSet){
    socket.emit('add_new_player', {});
});

function newQueue(){
    let queue = [];
    queue.push = function( chunk ) {
        Array.prototype.push.call( this, chunk )
        if (!sourceBuffer.updating) {
            sourceBuffer.dispatchEvent(new Event('updateend'));
        }
    };
    return queue;
}

function once(fn) {
    let result;

    return function() {
        if(fn) {
            result = fn.apply(this, arguments);
            fn = null;
        }

        return result;
    };
}

