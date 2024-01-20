// main loop


let theme = localStorage.getItem('saved_theme') || 'dark';
if (theme != 'dark') document.body.setAttribute('data-theme',theme);

if (theme == 'oled')
        theme_tip.setContent('OLED theme');
    else
        theme_tip.setContent('Dark theme');


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

    if (new_theme == 'oled')
        theme_tip.setContent('OLED theme');
    else
        theme_tip.setContent('Dark theme');
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
// 0.25s
let stocking_timeout = 250;
// 1s
let queue_timeout = 1000;


let last_stocking_file = {};

async function retrieve_stock() {
    // this references the function in main.py
    stocking = await eel.get_now_playing()();
    //console.log(stocking);


    // is this a fresh stocking?
    if (JSON.stringify(last_stocking_file) != JSON.stringify(stocking.file)) {
        last_stocking_file = stocking.file;

        // update track info
        document.getElementById('artwork').setAttribute('src',`data:image/png;base64,${stocking.file.album.cover}`);
        document.getElementById('track').textContent = stocking.file.track.title;
        document.getElementById('artist').innerHTML = parse_artists(stocking.file.track.artist,stocking.file.track.guests);

        document.getElementById('artwork-big').setAttribute('src',`data:image/png;base64,${stocking.file.album.cover}`);

        // update loved
        document.getElementById('action-love').setAttribute('data-type',stocking.file.track.loved);
    }


    // update play/pause
    document.getElementById('action-play-pause').setAttribute('data-type',stocking.status.state);
    if (stocking.status.state == 'Playing')
        play_tip.setContent('Pause');
    else
        play_tip.setContent('Resume');

    // shuffle
    document.getElementById('action-shuffle').setAttribute('data-type',stocking.status.shuffle);
    if (stocking.status.shuffle)
        shuffle_tip.setContent('Shuffle on');
    else
        shuffle_tip.setContent('Shuffle off');

    // loop
    document.getElementById('action-loop').setAttribute('data-type',stocking.status.repeat);
    if (stocking.status.repeat == 0)
        loop_tip.setContent('Repeat off');
    else if (stocking.status.repeat == 1)
        loop_tip.setContent('Repeat on');
    else
        loop_tip.setContent('Repeat once');


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


// nyaa
function parse_artists(artist,guests) {
    if (guests == '') {
        return `<span onclick="get_library('${artist}')">${artist}</span>`;
    } else {
        let guest_split = guests.replaceAll('','').split('\u0000');
        let text = '';
        for (let artist in guest_split)
            if (guest_split[artist] != '') text = text + `<span onclick="get_library('${guest_split[artist]}')">${guest_split[artist]}</span>, `;

        return text.substring(0,text.length - 2);
    }
}


// get library
let current_library = {};
let current_album_first_track_filename = '';
let current_view_album = '';
async function get_library(artist) {
    artist = artist.replaceAll('�','');
    document.getElementById('library-grid').style.removeProperty('display','none');
    document.getElementById('album').style.setProperty('display','none');
    document.getElementById('artist-artwork').style.removeProperty('display','none');
    document.getElementById('album-artwork').style.setProperty('display','none');

    document.body.style.removeProperty('--hue');
    document.body.style.removeProperty('--sat');
    document.body.style.removeProperty('--lit');


    document.getElementById('library-grid-title').textContent = artist;

    current_library = await eel.get_artist_library(artist)();
    //console.log(current_library);

    let sorted = [];
    for (let album in current_library)
        sorted.push({name:album,date:current_library[album][0].date});
    console.log(sorted);
    sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    console.log(sorted);

    //console.log(current_library);

    document.getElementById('library-grid-items').innerHTML = '';

    // show albums
    for (let album in sorted) {
        document.getElementById('library-grid-items').appendChild(await create_album(sorted[album].name));
    }
}


// create album
async function create_album(album) {
    console.log(album);

    let this_artwork = await get_album_artwork(current_library[album][0].rawr,false,current_library[album][0].album_artist,album);

    let em_album = document.createElement('button');
    em_album.classList.add('album-grid-item');
    em_album.setAttribute('onclick',`view_album('${album.replaceAll(`'`,`\\'`)}')`);
    em_album.innerHTML = (`
    <div class="artwork">
        <img src="data:image/png;base64,${this_artwork}">
    </div>
    <div class="details">
        <p class="track">${album}</p>
        <p class="artist">${current_library[album][0].album_artist}</p>
        <p class="date">${current_library[album][0].date}</p>
    </div>
    `);

    return em_album;
}


// artwork flow
async function get_album_artwork(rawr,force=false,album_artist,album) {
    let cached_artwork = localStorage.getItem(`cached_cover_${album_artist}_${album}`) || '';
    if (cached_artwork == '' || cached_artwork === null || force) {
        let new_artwork = await eel.get_artwork(rawr)();
        localStorage.setItem(`cached_cover_${album_artist}_${album}`,new_artwork);
        console.log('new',new_artwork);
        return new_artwork;
    } else {
        console.log('cache',cached_artwork);
        return cached_artwork;
    }
}


async function refresh_artwork() {
    document.getElementById('artwork-big-album').setAttribute('src',`data:image/png;base64,${await get_album_artwork(current_album_first_track_filename,true,current_library[current_view_album][0].album_artist,current_view_album)}`);
}


// show album
async function view_album(album) {
    document.getElementById('library-grid').style.setProperty('display','none');
    document.getElementById('album').style.removeProperty('display','none');
    document.getElementById('artist-artwork').style.setProperty('display','none');
    document.getElementById('album-artwork').style.removeProperty('display','none');

    document.getElementById('artwork-big-album').setAttribute('src',`data:image/png;base64,${await get_album_artwork(current_library[album][0].rawr,false,current_library[album][0].album_artist,album)}`);

    document.getElementById('artwork-big-album').addEventListener('load',function() {
        try {
            let vibrant = new Vibrant(document.getElementById('artwork-big-album'));
            let swatches = vibrant.swatches();
            for (let swatch in swatches) {
                let hsl = swatches.Vibrant.getHsl();
                document.body.style.setProperty('--hue',Math.round(hsl[0] * 360));
                document.body.style.setProperty('--sat',hsl[1]);
                //document.body.style.setProperty('--lit',hsl[2]);
            }
        } catch(e) {}
    })

    document.getElementById('album-title').textContent = album;
    document.getElementById('album-artist-title').textContent = current_library[album][0].album_artist;

    document.getElementById('album-tracklist').innerHTML = '';

    current_album_first_track_filename = current_library[album][0].rawr;
    current_view_album = album;

    for (let track in current_library[album].sort((a, b) => a.position - b.position)) {
        document.getElementById('album-tracklist').appendChild(create_track(current_library[album][track],track));
    }
    lucide.createIcons();
}


// exit album
function exit_album() {
    document.getElementById('library-grid').style.removeProperty('display','none');
    document.getElementById('album').style.setProperty('display','none');
    document.getElementById('artist-artwork').style.removeProperty('display','none');
    document.getElementById('album-artwork').style.setProperty('display','none');

    document.body.style.removeProperty('--hue');
    document.body.style.removeProperty('--sat');
    document.body.style.removeProperty('--lit');
}


// play album
function play_album() {
    eel.player_stop();
    eel.queue_clear();
    for (let track in current_library[current_view_album].sort((a, b) => a.position - b.position)) {
        eel.queue_next(current_library[current_view_album][track].rawr);
    }
    eel.player_toggle_play();
    get_queue();
}


// queue album last
function queue_album() {
    for (let track in current_library[current_view_album].sort((a, b) => a.position - b.position)) {
        eel.queue_last(current_library[current_view_album][track].rawr);
    }
    get_queue();
}


// create track in tracklist
function create_track(track,index,area='tracklist',now_playing=false) {
    let em_track = document.createElement('li');
    em_track.classList.add('track-item');
    em_track.innerHTML = (`
    <p class="position">${track.position}</p>
    <div class="details">
        <p class="track" onclick="play_track('${index}','${area}')">${track.title}</p>
        <p class="artist">${parse_artists(track.artist, track.guests)}</p>
    </div>
    <p class="length">${track.length}</p>
    <div class="actions">
        <button class="queue-remove" onclick="queue_remove('${index}','${area}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="minus" class="lucide lucide-minus icon w-16"><path d="M5 12h14"></path></svg>
        </button>
        <button class="queue-next" onclick="queue_next('${index}','${area}')"><i class="icon w-16" data-lucide="plus"></i></button>
    </div>
    `);

    if (track.guests == '' && track.artist == track.album_artist)
        em_track.classList.add('artist-same');

    if (now_playing)
        em_track.classList.add('primary');

    return em_track;
}


function play_track(index,area) {
    if (area == 'tracklist') {
        eel.play_track(current_library[current_view_album][index].rawr);
    }
}


function queue_next(index,area) {
    if (area == 'tracklist') {
        eel.queue_next(current_library[current_view_album][index].rawr);
        get_queue();
    }
}

function queue_remove(index,area) {
    if (area == 'queue') {
        eel.remove_queue_item(parseInt(index));
        get_queue();
    }
}


// nav
async function list_nav() {
    $.get('js/artists.json', function(nav_list) {
        console.log(nav_list);

        for (let artist in nav_list.sort((a, b) => a.localeCompare(b))) {
            document.getElementById('nav').appendChild(create_nav(nav_list[artist]));
        }
    });
}


function create_nav(artist) {
    console.log(artist);
    let em_nav = document.createElement('button');
    em_nav.classList.add('nav-item');
    em_nav.setAttribute('onclick',`get_library('${artist}')`);
    em_nav.textContent = artist;

    return em_nav;
}


function add_artist_modal() {
    create_window('Add an artist','Enter an artist\'s name as present in your library below.<br><br><input placeholder="Artist name..." id="artist-input">',[
        {
            type: 'primary',
            onclick: 'submit_artist()',
            text: 'Submit'
        },
        {
            onclick: 'kill_window(\'add_artist\')',
            text: 'Cancel'
        }
    ],'add_artist','star');
    document.getElementById('artist-input').focus();
}


async function submit_artist() {
    await eel.add_to_artists(document.getElementById('artist-input').value)();
    document.getElementById('nav').innerHTML = '';
    list_nav();
    kill_window('add_artist');
}


// queue
// TODO: in theory if this was all controlled by stocking, this
// periodic checking would not be required - as i could just
// (when required) append to these lists if they need to be changed
// maybe change in the future?

// TODO: maybe in the future queue could be completely stocking custom and we could
// periodically check the next queued track and make it match the next track in
// our custom queue :3 (would allow adding a track wherever we want in the queue)
// this would literally be easier lol
let queue_length = 0;
let queue = [];
let queue_formatted = [];
let last_queue = [];

let current_index = -1;
let last_index = -1;

let queue_element = document.createElement('ul');
queue_element.classList.add('queue');

async function get_queue() {
    // it returns starting from 1, the rest of the flow starts from 0
    // so we minus 1 here
    queue_length = await eel.get_queue_length()() - 1;

    last_queue = queue;
    queue = [];
    queue_formatted = [];

    for (let i = 0; i <= queue_length; i++) {
        let temporary_file_name = await eel.get_queue_item_file_url(i)();
        queue.push(temporary_file_name);

        // file info
        let temporary_file_info = await eel.parse_file(temporary_file_name,true,parseInt(i) + 1)();
        queue_formatted.push(temporary_file_info);
    }

    current_index = await eel.get_index()();

    //console.log(last_queue,(last_index + 1),JSON.stringify(last_queue) != JSON.stringify(queue) && last_index != current_index,'->',JSON.stringify(last_queue) != JSON.stringify(queue),last_index != current_index);
    if (JSON.stringify(last_queue) != JSON.stringify(queue) || last_index != current_index) {
        last_index = current_index;
        queue_element.innerHTML = '';
        for (let item in queue_formatted) {
            console.log(queue_formatted[item].position == (current_index + 1), queue_formatted[item].position, (current_index + 1));
            queue_element.appendChild(create_track(queue_formatted[item],item,'queue',queue_formatted[item].position == (current_index + 1)));
        }
        lucide.createIcons();

        queue_tip.setContent(`
        <div class="queue-content">
            <h3 class="head">Queue</h3>
            ${queue_element.outerHTML}
        </div>
        `);
    }
}




// volume
let volume = parseInt(localStorage.getItem('volume')) || 40;
let volume_is_muted = JSON.parse(localStorage.getItem('volume_muted')) || false;
let volume_increment = 5;
update_volume_tip();


function update_volume_tip() {
    localStorage.setItem('volume',volume);
    localStorage.setItem('volume_muted',volume_is_muted);

    if (volume_is_muted)
        eel.set_volume(0);
    else
        eel.set_volume(parseInt(volume));

    document.getElementById('action-volume').setAttribute('data-volume-step',volume_steps());
    volume_tip.setContent(`
        <div class="volume-content" data-volume-step="${volume_steps()}">
            <button class="volume-icons" onclick="volume_mute()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="volume-x" class="lucide lucide-volume-x icon w-16 vol-mute"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="22" x2="16" y1="9" y2="15"></line><line x1="16" x2="22" y1="9" y2="15"></line></svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="volume" class="lucide lucide-volume icon w-16 vol-0"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="volume-1" class="lucide lucide-volume-1 icon w-16 vol-1"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="volume-2" class="lucide lucide-volume-2 icon w-16 vol-2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
            </button>
            <p>${volume}%</p>
            <button class="down" onclick="volume_down()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="minus" class="lucide lucide-minus icon w-16"><path d="M5 12h14"></path></svg>
            </button>
            <div class="bar">
                <div class="fill" id="volume-bar-fill" style="width: ${volume}%"></div>
            </div>
            <button class="up" onclick="volume_up()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="plus" class="lucide lucide-plus icon w-16"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
            </button>
        </div>
    `);
}


function volume_up() {
    if (volume <= (100 - volume_increment)) volume += volume_increment;
    update_volume_tip();
}
function volume_down() {
    if (volume >= volume_increment) volume -= volume_increment;
    update_volume_tip();
}
function volume_mute() {
    if (volume_is_muted)
        volume_is_muted = false;
    else
        volume_is_muted = true;
    update_volume_tip();
}

function volume_steps() {
    if (volume_is_muted) {
        return -1;
    } else if (volume <= 30) {
        return 0;
    } else if (volume <= 54) {
        return 1;
    } else {
        return 2;
    }
}




// shuffle & loop
function player_toggle_loop() {
    if (stocking.status.repeat <= 1) {
        eel.set_loop_state(stocking.status.repeat += 1);
    } else {
        eel.set_loop_state(0);
    }
}

function player_toggle_shuffle() {
    if (stocking.status.shuffle <= 0) {
        eel.set_shuffle_state(stocking.status.shuffle += 1);
    } else {
        eel.set_shuffle_state(0);
    }
}


list_nav();
setInterval(retrieve_stock,stocking_timeout);
setInterval(get_queue,queue_timeout);




// input
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 'q') {
        add_artist_modal();
        event.preventDefault();
    }
});