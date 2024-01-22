// main loop


let theme = localStorage.getItem('saved_theme') || 'dark';
save_theme(theme);


let grid_view = 'Album';
document.getElementById('view-selector').addEventListener('change', function(grid_view_temp) {
    grid_view = document.getElementById('view-selector').value;
    document.getElementById('library-grid').setAttribute('data-grid-view',grid_view);
});


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

    theme_tip.setContent(`
    <div class="dropdown-content">
        <ul class="menu" data-theme="${new_theme}">
            <li class="menu-option light" onclick="save_theme('light')">Light</li>
            <li class="menu-option dark" onclick="save_theme('dark')">Dark</li>
            <li class="menu-option oled" onclick="save_theme('oled')">OLED</li>
        </ul>
    </div>
    `);
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
// 0.4s
let stocking_timeout = 400;
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

    // if this fails, no track has been marked as playing yet
    try {
        let current_playing_item = document.getElementsByClassName('track-item-album-now-playing')[0];
        if (current_playing_item.getAttribute('id') != `track-item-${stocking.file.track.rawr}`) {
            current_playing_item.classList.remove('track-item-album-now-playing','primary');
            current_playing_item.removeAttribute('id');
        }
    } catch(e) {}
    // if this fails, either not on album page or now playing track isnt in the album
    try {
        // TODO: dont do this a million times, cant put it in the if check above cus that can fail so..
        document.getElementById(`track-item-${stocking.file.track.rawr}`).classList.add('track-item-album-now-playing','primary');
    } catch(e) {}


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

    //return mins.substr(-2) + ':' + secs.substr(-2);
    return date.getMinutes() + ':' + secs.substr(-2);
}

function parse_timestamp_2(rawr) {
    let mins = Math.floor(rawr / 60);
    let secs = '0' + (rawr - mins * 60);

    return mins + ':' + secs.substr(-2);
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


    document.getElementById('library-grid-title').textContent = artist;
    document.getElementById('artwork-big-artist').setAttribute('src',`data:image/png;base64,${await eel.get_artist_artwork(`${artist}`)()}`);

    document.getElementById('artwork-big-artist').addEventListener('load',function() {
        try {
            let vibrant = new Vibrant(document.getElementById('artwork-big-artist'));
            let swatches = vibrant.swatches();
            for (let swatch in swatches) {
                let hsl = swatches.DarkVibrant.getHsl();
                document.body.style.setProperty('--hue',Math.round(hsl[0] * 360));
                document.body.style.setProperty('--sat',hsl[1]);
                //document.body.style.setProperty('--lit',hsl[2]);
            }
        } catch(e) {}
    });


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
    let years = [];

    // show albums
    for (let album in sorted) {
        let year = new Date(sorted[album].date).getFullYear();
        //console.log(year,typeof(year));
        console.log(years,year,years.includes(year),year.toString(),!(years.includes(year)) && year.toString() !== 'NaN');
        if (!(year in years) && year.toString() !== 'NaN') {
            document.getElementById('library-grid-items').appendChild(create_album_grid(year));
            years[year] = {
                album: 0,
                single: 0,
                ep: 0,
                dj: 0,
                bside: 0
            };
        }
        console.log(sorted[album]);
        try { document.getElementById(`library-grid-${year}`).appendChild(await create_album(sorted[album].name)); years[year][release_format(current_library[sorted[album].name][0].release)] += 1; } catch(e) {console.error(e)};
    }
    console.log('years',years);
    lucide.createIcons();

    for (let year in years) {
        if (years[year].album == 0) {
            document.getElementById(`library-grid-inner-${year}`).classList.add('hide-for-album-view');
        } else if (years[year].single == 0) {
            document.getElementById(`library-grid-inner-${year}`).classList.add('hide-for-single-view');
        } else if (years[year].ep == 0) {
            document.getElementById(`library-grid-inner-${year}`).classList.add('hide-for-ep-view');
        } else if (years[year].dj == 0) {
            document.getElementById(`library-grid-inner-${year}`).classList.add('hide-for-dj-view');
        } else if (years[year].bside == 0) {
            document.getElementById(`library-grid-inner-${year}`).classList.add('hide-for-bside-view');
        }
    }

    document.getElementById('library-grid').style.removeProperty('display','none');
    document.getElementById('album').style.setProperty('display','none');
    document.getElementById('album-details').style.setProperty('display','none');
    document.getElementById('artist-artwork').style.removeProperty('display','none');
    document.getElementById('album-artwork').style.setProperty('display','none');

    //document.body.style.removeProperty('--hue');
    //document.body.style.removeProperty('--sat');
    //document.body.style.removeProperty('--lit');
}


function release_format(release) {
    if (release.includes('Album'))
        return 'album';
    else if (release.includes('Single'))
        return 'single';
    else if (release.includes('EP'))
        return 'ep';
    else if (release.includes('DJ Mix'))
        return 'dj';
    else if (release.includes('B-Sides'))
        return 'bside';
}


function create_album_grid(year) {
    let em_grid = document.createElement('div');
    em_grid.classList.add('library-grid-inner');
    em_grid.setAttribute('id',`library-grid-inner-${year}`);
    em_grid.innerHTML = (`
    <h3 class="year-title">${year}</h3>
    <div class="album-grid" id="library-grid-${year}"></div>
    `);
    return em_grid;
}


// create album
async function create_album(album) {
    console.log(album);

    let this_artwork = await get_album_artwork(current_library[album][0].rawr,false,current_library[album][0].album_artist,album);

    let em_album = document.createElement('button');
    em_album.classList.add('album-grid-item');
    em_album.setAttribute('onclick',`view_album('${album.replaceAll(`'`,`\\'`)}')`);
    em_album.setAttribute('data-album-release',current_library[album][0].release);
    console.log('b',this_artwork);

    if (this_artwork == '' || this_artwork == -1 || this_artwork == null) {
        em_album.innerHTML = (`
        <div class="artwork missing">
            <i class="icon w-48" data-lucide="disc-album"></i>
        </div>
        <div class="details">
            <p class="track">${album}</p>
            <p class="artist">${current_library[album][0].album_artist}</p>
            <p class="date">${current_library[album][0].date}</p>
        </div>
        `);
    } else {
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
    }

    return em_album;
}


// artwork flow
async function get_album_artwork(rawr,force=false,album_artist,album) {
    let new_artwork = await eel.get_artwork(rawr)();
    return new_artwork;
    /*let cached_artwork = localStorage.getItem(`cached_cover_${album_artist}_${album}`) || '';
    if (cached_artwork == '' || force) {
        let new_artwork = await eel.get_artwork(rawr)();
        if (new_artwork != -1) {
            localStorage.setItem(`cached_cover_${album_artist}_${album}`,new_artwork);
            console.log('new',new_artwork);
        }
        return new_artwork;
    } else {
        console.log('cache',cached_artwork);
        return cached_artwork;
    }*/
}


async function refresh_artwork() {
    document.getElementById('artwork-big-album').setAttribute('src',`data:image/png;base64,${await get_album_artwork(current_album_first_track_filename,true,current_library[current_view_album][0].album_artist,current_view_album)}`);
}


// show album
async function view_album(album) {
    document.getElementById('album-title').textContent = album;
    document.getElementById('album-artist-title').textContent = current_library[album][0].album_artist;

    document.getElementById('album-tracklist').innerHTML = '';

    document.getElementById('artwork-big-album').setAttribute('src',`data:image/png;base64,${await get_album_artwork(current_library[album][0].rawr,false,current_library[album][0].album_artist,album)}`);

    document.getElementById('detail-release').textContent = current_library[album][0].release;
    document.getElementById('detail-date').textContent = current_library[album][0].date;
    document.getElementById('detail-bio').innerHTML = '';
    await get_artist_bio(current_library[album][0].album_artist,album);

    document.getElementById('library-grid').style.setProperty('display','none');
    document.getElementById('album').style.removeProperty('display','none');
    document.getElementById('album-details').style.removeProperty('display','none');
    document.getElementById('artist-artwork').style.setProperty('display','none');
    document.getElementById('album-artwork').style.removeProperty('display','none');

    document.getElementById('artwork-big-album').addEventListener('load',function() {
        try {
            let vibrant = new Vibrant(document.getElementById('artwork-big-album'));
            let swatches = vibrant.swatches();
            for (let swatch in swatches) {
                let hsl = swatches.DarkVibrant.getHsl();
                document.body.style.setProperty('--hue',Math.round(hsl[0] * 360));
                document.body.style.setProperty('--sat',hsl[1]);
                //document.body.style.setProperty('--lit',hsl[2]);
            }
        } catch(e) {}
    });

    current_album_first_track_filename = current_library[album][0].rawr;
    current_view_album = album;

    let last_disc = -1;
    let album_length = 0;

    for (let track in current_library[album].sort((a, b) => a.disc.localeCompare(b.disc) || a.position - b.position)) {
        let track_disc = current_library[album][track].disc;
        if (last_disc != track_disc) {
            document.getElementById('album-tracklist').appendChild(create_tracklist(track_disc));
            last_disc = track_disc;
        }
        document.getElementById(`album-tracklist-${track_disc}`).appendChild(create_track(current_library[album][track],track));
        album_length += parse_formatted_timestamp(current_library[album][track].length);
    }
    tippy(document.querySelectorAll('.queue-next'),{
        content: 'Queue next'
    });
    tippy(document.querySelectorAll('.queue-last'),{
        content: 'Queue last'
    });
    tippy(document.querySelectorAll('.queue-album-from'),{
        content: 'Queue track onwards'
    });
    lucide.createIcons();

    console.log('length',album_length);
    document.getElementById('detail-length').textContent = parse_timestamp_2(album_length);
}


function parse_formatted_timestamp(time) {
    let temp = time.split(':');

    let mins = parseInt(temp[0]) * 60;
    let secs = parseInt(temp[1]);
    console.log(mins,secs,mins + secs,parse_timestamp((mins + secs) * 1000));
    return mins + secs;
}


// exit album
function exit_album() {
    document.getElementById('library-grid').style.removeProperty('display','none');
    document.getElementById('album').style.setProperty('display','none');
    document.getElementById('album-details').style.setProperty('display','none');
    document.getElementById('artist-artwork').style.removeProperty('display','none');
    document.getElementById('album-artwork').style.setProperty('display','none');

    let vibrant = new Vibrant(document.getElementById('artwork-big-artist'));
    let swatches = vibrant.swatches();
    for (let swatch in swatches) {
        let hsl = swatches.DarkVibrant.getHsl();
        document.body.style.setProperty('--hue',Math.round(hsl[0] * 360));
        document.body.style.setProperty('--sat',hsl[1]);
        //document.body.style.setProperty('--lit',hsl[2]);
    }

    //document.body.style.removeProperty('--hue');
    //document.body.style.removeProperty('--sat');
    //document.body.style.removeProperty('--lit');
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


// play album from point
function play_album_from(position) {
    eel.player_stop();
    eel.queue_clear();

    let sorted_tracks = current_library[current_view_album].sort((a, b) => a.position - b.position);
    for (let i = position; i <= sorted_tracks.length; i++) {
        eel.queue_next(sorted_tracks[track].rawr);
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


// queue album last from point
function queue_album_from(position,area) {
    let sorted_tracks = current_library[current_view_album].sort((a, b) => a.position - b.position);
    for (let i = position; i <= sorted_tracks.length; i++) {
        eel.queue_last(sorted_tracks[i].rawr);
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
        <button class="queue-last" onclick="queue_last('${index}','${area}')"><i class="icon w-16" data-lucide="chevrons-right"></i></button>
        <button class="queue-album-from" onclick="queue_album_from('${index}','${area}')"><i class="icon w-16" data-lucide="list-end"></i></button>
    </div>
    `);

    if (area == 'tracklist')
        em_track.setAttribute('id',`track-item-${track.rawr}`);

    if (track.guests == '' && track.artist == track.album_artist)
        em_track.classList.add('artist-same');

    if (now_playing)
        em_track.classList.add('primary');

    return em_track;
}

function create_tracklist(disc) {
    let em_disc = document.createElement('div');
    em_disc.classList.add('tracklist-container-inner');

    if (disc != 0 && disc != undefined) {
        em_disc.innerHTML = (`
        <h3 class="disc-title">Disc ${disc}</h3>
        <ul class="tracklist" id="album-tracklist-${disc}"></ul>
        `);
    } else {
        em_disc.innerHTML = (`
        <ul class="tracklist" id="album-tracklist-${disc}"></ul>
        `);
    }

    return em_disc;
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

function queue_last(index,area) {
    if (area == 'tracklist') {
        eel.queue_last(current_library[current_view_album][index].rawr);
        get_queue();
    }
}

function queue_remove(index,area) {
    if (area == 'queue') {
        eel.remove_queue_item(parseInt(index));
        get_queue();
    }
}

function queue_clear() {
    eel.player_stop();
    eel.queue_clear();
    get_queue();
}


// get artist bio
async function get_artist_bio(artist,album) {
    $.get('js/albums.json', function(data) {
        console.log('albums',data);
        console.log(data[artist][album]);
        if (artist in data)
            if (album in data[artist])
                parse_markdown(data[artist][album].bio);
        else
            return '';
    });
}


function parse_markdown(text) {
    console.log(`parsing markdown of ${text}`);
    let conv = new showdown.Converter({
        requireSpaceBeforeHeadingText: true,
        simpleLineBreaks: true
    });
    let html = conv.makeHtml(text);
    console.log('returning',html);
    document.getElementById('detail-bio').innerHTML = html;
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
            <div class="head flex">
                <h3>Queue</h3>
                <button class="cute" onclick="queue_clear()">Clear</button>
            </div>
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