'use strict';

let socket = io();

let mediaPlayer = document.querySelector('audio');
let mediaSource;

const mimeCodec = 'audio/mpeg;';
let sourceBuffer;

let mp3BitRate;

function createMediaPlayer(){
    if(mediaPlayer){
        mediaPlayer.remove();
    }

    mediaPlayer = document.createElement('audio');
    mediaPlayer.setAttribute('controls','');
    document.querySelector('body').appendChild(mediaPlayer);

    if ('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)) {
        mediaSource = new MediaSource;
        mediaPlayer.src = URL.createObjectURL(mediaSource);
        mediaSource.addEventListener('sourceopen', function(){
            sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
        });
    } else {
        console.error('Unsupported MIME type or codec: ', mimeCodec);
    }
}

document.getElementById('files').addEventListener('change', function(event) {
    createMediaPlayer();
    socket.emit('new_stream');
    let file = event.target.files[0];
    readFile(file, function(arrayBuffer){

        let tags = mp3Parser.readTags(new DataView(arrayBuffer));
        tags.forEach((item)=>{
            if(item.header && item.header.bitrate){
                mp3BitRate = item.header.bitrate;
            }
        });

        sourceBuffer.addEventListener('updateend', function (_) {
            mediaSource.endOfStream();
            console.log('File length: ' + arrayBuffer.byteLength);
            console.log('Duration: ' + mediaPlayer.duration);
            console.log('Calculated BitRate: ' + arrayBuffer.byteLength / mediaPlayer.duration + 'bps');
            console.log('Read BitRate: ' + mp3BitRate + 'bps');

            //I have to wait for the mp3BitRate to start emitting
            let slicedFile = chunkFile(arrayBuffer);
            emitChunks(slicedFile, 10);

            emitTicks(300);

            mediaPlayer.play();
        });
        sourceBuffer.appendBuffer(arrayBuffer);
    })
}, false);


function readFile(file, cb){
    let reader = new FileReader();

    reader.onload = function(e) {
        cb(reader.result)
    };

    reader.readAsArrayBuffer(file);
}

function emitChunks(slicedFile, intervalDuration){
    let next = 0;
    let interval = setInterval(()=>{
        if(next < slicedFile.length){
            let chunk = slicedFile[next++];
            socket.emit('chunk_in', chunk);
        }else{
            clearInterval(interval)
        }
    }, intervalDuration);
}

function chunkFile(file){
    let chunksNumber = 60;
    let array = [];

    let offset = Math.floor(file.byteLength / chunksNumber);
    for(let currentPos = 0; currentPos < file.byteLength; currentPos += offset){

        let startPosition = currentPos;
        let endPosition = startPosition + offset;

        array.push(chunkIt(file, startPosition, endPosition));
    }

    return array;
}

function chunkIt(file, startPosition, endPosition){
    let newChunk = {
        id: getDuration(startPosition)
    };
    if(endPosition < file.byteLength){
        newChunk.data = file.slice(startPosition, endPosition);
    }else{
        newChunk.data = file.slice(startPosition);
    }

    return newChunk;
}

//Given bytes of an mp3 song, return duration in seconds
function getDuration(byteLength){
    //return duration in seconds
    return byteLength / (mp3BitRate * 1000 / 8);
}

function emitTicks(interval){
    setInterval(()=>{
        socket.emit('source_seek_time', {time: mediaPlayer.currentTime, timeStamp: new Date().getTime()});
    }, interval);
}







