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
// 0.1s
let stocking_timeout = 100;
// 1s
let queue_timeout = 1000;


async function retrieve_stock() {
    // this references the function in main.py
    stocking = await eel.get_now_playing()();
    //console.log(stocking);


    // update play/pause
    document.getElementById('action-play-pause').setAttribute('data-type',stocking.status.state);
    if (stocking.status.state == 'Playing')
        play_tip.setContent('Pause');
    else
        play_tip.setContent('Resume');

    // update track info
    document.getElementById('artwork').setAttribute('src',`data:image/png;base64,${stocking.file.album.cover}`);
    document.getElementById('track').textContent = stocking.file.track.title;
    document.getElementById('artist').innerHTML = parse_artists(stocking.file.track.artist,stocking.file.track.guests);

    document.getElementById('artwork-big').setAttribute('src',`data:image/png;base64,${stocking.file.album.cover}`);

    // update loved
    document.getElementById('action-love').setAttribute('data-type',stocking.file.track.loved);

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
        return artist;
    } else {
        let guest_split = guests.split('');
        let text = '';
        for (let artist in guest_split)
            text = text + `<span onclick="get_library('${guest_split[artist]}')">${guest_split[artist]}</span>, `;

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
    let count = 0;
    for (let album in sorted) {
        console.log(count);
        document.getElementById('library-grid-items').appendChild(await create_album(sorted[album].name));
        count += 1;
    }
}


// create album
async function create_album(album) {
    console.log(album);

    let this_artwork = await get_album_artwork(current_library[album][0].rawr,false,current_library[album[0].album_artist],album);

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

    document.getElementById('album-title').textContent = album;
    document.getElementById('album-artist-title').textContent = current_library[album][0].album_artist;

    document.getElementById('album-tracklist').innerHTML = '';

    current_album_first_track_filename = current_library[album][0].rawr;
    current_view_album = album;

    for (let track in current_library[album].sort((a, b) => a.position - b.position)) {
        document.getElementById('album-tracklist').appendChild(create_track(current_library[album][track]));
    }
}


// exit album
function exit_album() {
    document.getElementById('library-grid').style.removeProperty('display','none');
    document.getElementById('album').style.setProperty('display','none');
    document.getElementById('artist-artwork').style.removeProperty('display','none');
    document.getElementById('album-artwork').style.setProperty('display','none');
}


// create track in tracklist
function create_track(track) {
    let em_track = document.createElement('li');
    em_track.classList.add('track-item');
    em_track.innerHTML = (`
    <p class="position">${track.position}</p>
    <div class="details">
        <p class="track" onclick="eel.play_track('${track.rawr.replaceAll('\\','\\\\')}')">${track.title}</p>
        <p class="artist">${parse_artists(track.artist, track.guests)}</p>
    </div>
    `);

    return em_track;
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

    if (JSON.stringify(last_queue) != JSON.stringify(queue)) {
        document.getElementById('queue').innerHTML = '';
        for (let item in queue_formatted)
            document.getElementById('queue').appendChild(create_track(queue_formatted[item]));
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