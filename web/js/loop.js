// main loop


let stocking = {
    file: {
        track: {
            title: '',
            artist: '',
            guests: ''
        },
        album: {
            title: '',
            artist: ''
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


    // update time
    document.getElementById('current-time').textContent = parse_timestamp(stocking.status.time.position);
    document.getElementById('duration').textContent = parse_timestamp(stocking.status.time.duration);
}


// rawr
function parse_timestamp(rawr) {
    let date = new Date(rawr);
    let mins = '0' + date.getMinutes();
    let secs = '0' + date.getSeconds();

    return mins.substr(-2) + ':' + secs.substr(-2);
}


setInterval(retrieve_stock,stocking_timeout);