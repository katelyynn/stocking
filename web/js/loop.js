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
let stocking_timeout = 500;


async function retrieve_stock() {
    // this references the function in main.py
    stocking = await eel.get_now_playing()();
    console.log(stocking);


    // update play/pause
    document.getElementById('action-play-pause').setAttribute('data-type',stocking.status.state);
}


setInterval(retrieve_stock,stocking_timeout);