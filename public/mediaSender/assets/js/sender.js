'use strict';

var mediaPlayer = document.querySelector('audio');
const mimeCodec = 'audio/mpeg;';
const url = 'assets/song.mp3';


var sourceBuffer;
let socket = io();
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

    getSong();
}

function getSong(){
    var xhr = new XMLHttpRequest;
    xhr.open('get', url);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function () {

        let chunksNumber = 60;
        let array = [];

        let offset = Math.floor(xhr.response.byteLength / chunksNumber);
        for(let currentPos = 0, pos = 0; currentPos < xhr.response.byteLength; currentPos += offset, pos++){
            let startPosition = currentPos;
            let endPosition = startPosition + offset;
            if(endPosition < xhr.response.byteLength){
                array[pos] = xhr.response.slice(startPosition, endPosition);
            }else{
                array[pos] = xhr.response.slice(startPosition);
            }
        }

        let next = 0;
        let interval = setInterval(()=>{
            if(next < array.length){
                let chunk = array[next++];
                queue.push(chunk);
                socket.emit('chunk_in', chunk);
            }else{
                queue.push('done');
                clearInterval(interval)
            }
        }, 1000);


    };
    xhr.send();
}







