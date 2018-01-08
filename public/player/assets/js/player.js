'use strict';

/*
* Possibles issues with getting in sync
* Time in millis difference between devices
* Delay between media.currentTime and play
* */

let mediaPlayer;
let acceptanceButton;
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
    //mediaPlayer.setAttribute('autoplay','');
    addEventsListeners();
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
            try{
                sourceBuffer.appendBuffer(chunk.data);
            }catch (error){
                console.log(error);
            }

        }

    });

    fetchAB(function (buf) {
        queue.push(buf);
    });

}

function fetchAB (update) {

    let setOffSet = once(function(offSet){
        offSetPosition = offSet;
    });
    let showAcceptanceMessageOnce = once(function(offSet){
        showAcceptanceMessage();
    });

    socket.removeListener('chunk_in');
    socket.removeListener('source_seek_time');
    subscribePlayer();

    socket.on('chunk_in', function(chunk){
        showAcceptanceMessageOnce();
        setOffSet(chunk.id);
        update(chunk);
    });

    socket.on('source_seek_time', function(source_seek){
        let latency = ((new Date().getTime()) - source_seek.timeStamp) / 1000;
        if(offSetPosition != null && source_seek.time - (mediaPlayer.currentTime + offSetPosition) > latency){
            let timePosition = (source_seek.time - offSetPosition) + latency + seekingTime;
            mediaPlayer.currentTime = timePosition;
        }
    });
}

let seekingTime = 0;
function addEventsListeners(){

    let lastPlayingTime = 0;
    let lastSeekingTime = 0;

    mediaPlayer.addEventListener('playing', ()=>{
        lastPlayingTime = new Date().getTime() / 1000;

        if(lastSeekingTime > 0) {
            if(lastPlayingTime - lastSeekingTime > 0.1) {
                seekingTime = lastPlayingTime - lastSeekingTime;
                mediaPlayer.currentTime = mediaPlayer.currentTime + seekingTime;
            }
        }
        lastSeekingTime = 0;

    });
    mediaPlayer.addEventListener('seeking', ()=>{
        lastSeekingTime = new Date().getTime() / 1000;
    });
}

function showAcceptanceMessage(){
    //On mobile devices mediaPlayer.play only works if it's thrown by an user interaction
    if(acceptanceButton){
        acceptanceButton = acceptanceButton.remove();
    }
    acceptanceButton = document.createElement('button');
    acceptanceButton.style.width = '200px';
    acceptanceButton.style.height = '200px';
    acceptanceButton.innerHTML = 'Accept incoming data';
    acceptanceButton.addEventListener('click', function () {
        mediaPlayer.play();
        acceptanceButton.remove();
    });
    document.querySelector('body').appendChild(acceptanceButton);
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

