'use strict';

let mimeCodec = 'audio/mpeg';
let video = document.querySelector('video');

if ('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)) {
    let mediaSource = new MediaSource();
    //console.log(mediaSource.readyState); // closed
    video.src = URL.createObjectURL(mediaSource);
    mediaSource.addEventListener('sourceopen', sourceOpen);
} else {
    console.error('Unsupported MIME type or codec: ', mimeCodec);
}

function sourceOpen (_) {
    //console.log(this.readyState); // open
    let mediaSource = this;
    let sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);

    document.getElementById('files').addEventListener('change', function(event) {
        let file = event.target.files[0];
        var reader = new FileReader();

        reader.onload = function(e) {
            var arrayBuffer = reader.result;
            sourceBuffer.addEventListener('updateend', function (_) {
                mediaSource.endOfStream();
                console.log('File length: ' + arrayBuffer.byteLength);
                console.log('Duration: ' + video.duration);
                console.log('BitRatio: ' + (arrayBuffer.byteLength * 8) / video.duration + 'bps');
                video.play();
            });
            sourceBuffer.appendBuffer(arrayBuffer);
        };

        reader.readAsArrayBuffer(file);


    }, false);
}

