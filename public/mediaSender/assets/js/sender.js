'use strict';

let socket = io();

var xhr = new XMLHttpRequest;
xhr.open('get', 'assets/frag_bunny.mp4');
xhr.responseType = 'arraybuffer';
xhr.onload = function () {
    socket.emit('chunk_in', xhr.response);
};
xhr.send();







