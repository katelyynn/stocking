// main loop


let theme = localStorage.getItem('saved_theme') || 'dark';
if (theme != 'dark') document.body.setAttribute('data-theme',theme);


function toggle_theme() {
    if (theme == 'dark')
        save_theme('oled');
    else
        save_theme('dark');
}

function save_theme(new_theme) {
    document.body.setAttribute('data-theme',new_theme);
    localStorage.setItem('saved_theme',new_theme);
    theme = new_theme;
}


let stocking = {
    file: {
        track: {
            title: '',
            artist: '',
            guests: '',
            loved: false
        },
        album: {
            title: '',
            artist: '',
            cover: ''
        }
    },
    status: {
        state: '',
        time: {
            position: 0,
            duration: 0
        }
    }
};
// 0.5s
let stocking_timeout = 100;


async function retrieve_stock() {
    // this references the function in main.py
    stocking = await eel.get_now_playing()();
    console.log(stocking);


    // update play/pause
    document.getElementById('action-play-pause').setAttribute('data-type',stocking.status.state);

    // update track info
    document.getElementById('artwork').setAttribute('src',`data:image/png;base64,${stocking.file.album.cover}`);
    document.getElementById('track').textContent = stocking.file.track.title;
    document.getElementById('artist').textContent = stocking.file.track.artist;

    // update loved
    document.getElementById('action-love').setAttribute('data-type',stocking.file.track.loved);

    // shuffle
    document.getElementById('action-shuffle').setAttribute('data-type',stocking.status.shuffle);

    // loop
    document.getElementById('action-loop').setAttribute('data-type',stocking.status.repeat);


    // update time
    document.getElementById('current-time').textContent = parse_timestamp(stocking.status.time.position);
    document.getElementById('duration').textContent = parse_timestamp(stocking.status.time.duration);

    // player bar
    document.getElementById('bar-fill').style.setProperty('width',`${(stocking.status.time.position / stocking.status.time.duration) * 100}%`);
}


// rawr
function parse_timestamp(rawr) {
    let date = new Date(rawr);
    let mins = '0' + date.getMinutes();
    let secs = '0' + date.getSeconds();

    return mins.substr(-2) + ':' + secs.substr(-2);
}


setInterval(retrieve_stock,stocking_timeout);