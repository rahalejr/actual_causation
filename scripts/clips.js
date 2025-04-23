import { experimentConfig } from './config.js';

export function playClip(condition, callback) {
    var video = document.getElementById('clips');
    var source = document.getElementById('clip-cond');

    console.log(condition);
    console.log(['and', 'or'].includes(condition));

    source.src = ['and', 'or'].includes(condition) ? '/clips/clip_' + condition + '.mp4' : '/clips/clip_' + condition + '.mov'

    console.log("VIDEO:", video, "SOURCE:", source);

    video.width = experimentConfig.styles.width;
    video.height = experimentConfig.styles.height;

    video.onended = null;
    video.onended = function() {
        if (typeof callback == 'function') callback();
    };
    
    video.classList.remove('invisible');
    video.removeAttribute('controls');
    video.muted = true;
    video.load();
    video.play();
  }