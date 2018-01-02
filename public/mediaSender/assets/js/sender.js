'use strict';

var mediaPlayer = document.querySelector('audio');
const mimeCodec = 'audio/mpeg;';
const url = 'assets/song.mp3';


let sourceBuffer;
let socket = io();
let queue = [];
queue.push = function( chunk ) {
    if (chunk !== 'done' && !sourceBuffer.updating && this.length === 0 ) {
        sourceBuffer.appendBuffer( chunk )
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
            let nextElement = queue.shift();
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

        socket.emit('total_size', xhr.response.byteLength);

        let chunksNumber = 60;
        let array = [];

        let offset = Math.floor(xhr.response.byteLength / chunksNumber);
        for(let currentPos = 0, pos = 0; currentPos < xhr.response.byteLength; currentPos += offset, pos++){

            let startPosition = currentPos;
            let endPosition = startPosition + offset;

            let newChunk = {
                id: getDuration(startPosition)
            };
            if(endPosition < xhr.response.byteLength){
                newChunk.data = xhr.response.slice(startPosition, endPosition);
            }else{
                newChunk.data = xhr.response.slice(startPosition);
            }
            array[pos] = newChunk;
        }


        let next = 0;
        let interval = setInterval(()=>{
            if(next < array.length){
                let chunk = array[next++];
                socket.emit('chunk_in', chunk);
                queue.push(chunk.data);
            }else{
                queue.push('done');
                clearInterval(interval)
            }
        }, 1000);


    };
    xhr.send();
}

//Given bytes of an mp3 song, return duration in seconds
function getDuration(byteLength){
    //192 kbps
    const mp3BitRate = 192000 / 8;
    //return duration in seconds
    return byteLength / mp3BitRate;
}

setInterval(()=>{
    socket.emit('source_seek_time', mediaPlayer.currentTime)
}, 500);







