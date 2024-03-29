import os
import struct
from musicbeeipc import *
import asyncio
import time

import eel
import eel.browsers

import base64
from PIL import Image
from io import BytesIO

# for logging on py side
# can remove
from colorama import init
from colorama import Fore, Back, Style
init()

import json

mb = MusicBeeIPC()

last_known_artwork = ''
last_known_b64 = ''

@eel.expose()
def get_now_playing():
    global last_known_artwork
    global last_known_b64
    #print(f"{Back.RED}{Style.BRIGHT}{mb.get_file_tag(MBMD_Artist)}{Style.RESET_ALL} {Back.BLUE}{Style.BRIGHT}{mb.get_file_tag(MBMD_TrackTitle)}{Style.RESET_ALL} {Back.YELLOW}{Style.BRIGHT}{mb.get_file_tag(MBMD_Album)}{Style.RESET_ALL}")
    #print(f"{Back.GREEN}{Style.BRIGHT}{mb.get_play_state_str()}{Style.RESET_ALL} / Time: {mb.get_position()} of {mb.get_duration()}")

    temp_artwork = mb.get_artwork_url()

    if last_known_artwork != temp_artwork:
        try:
            img = Image.open(temp_artwork)
            res_img = img.resize((300, 300))
            if res_img.mode in ('RGBA', 'P'):
                res_img = res_img.convert('RGB')
            output = BytesIO()
            res_img.save(output, format="JPEG")

            #with open(res_img, 'rb') as image:
            last_known_b64 = base64.b64encode(output.getvalue()).decode("utf-8")
            last_known_artwork = temp_artwork
        except FileNotFoundError:
            print("artwork does not exist?")
        except AttributeError:
            print("blehhhhh")

    send = {
        'file': {
            'track': {
                'title': mb.get_file_tag(MBMD_TrackTitle),
                'artist': mb.get_file_tag(MBMD_Artist),
                'guests': mb.get_file_tag(MBMD_MultiArtist),
                'loved': mb.get_file_tag(MBMD_RatingLove),
                'rawr': mb.get_file_url()
            },
            'album': {
                'title': mb.get_file_tag(MBMD_Album),
                'artist': mb.get_file_tag(MBMD_AlbumArtist),
                'cover': last_known_b64
            }
        },
        'status': {
            'state': mb.get_play_state_str(),
            'shuffle': mb.get_shuffle(),
            'repeat': mb.get_repeat(),
            'time': {
                'position': mb.get_position(),
                'duration': mb.get_duration()
            },
            'index': mb.get_current_index()
        }
    }

    #print (send)
    return send

@eel.expose()
def player_toggle_play():
    mb.play_pause()

@eel.expose()
def player_prev():
    mb.previous_track()

@eel.expose()
def player_next():
    mb.next_track()

@eel.expose()
def player_stop():
    mb.stop()

@eel.expose()
def play_track(rawr):
    mb.play_now(rawr)

@eel.expose()
def get_artist_library(artist=''):
    rawr = mb.library_search(query=artist,comparison="Is",fields=['AlbumArtist'])
    meow = {}

    count = 0
    for item in rawr:
        #print(count)
        album = mb.library_get_file_tag(item,MBMD_Album)
        if album not in meow:
            meow[album] = []

        meow[album].append(parse_file(item,False))
        count += 1

    #print(meow)
    return meow


@eel.expose()
def get_artwork(rawr):
    try:
        print('')
        # artwork embedded in file
        temp_artwork_get = mb.library_get_file_tag(rawr,MBMD_Artwork)
        get_cover = ''
        #print(os.path.dirname(temp_artwork_get))
        if (temp_artwork_get.endswith(('.mp3','.m4a','.flac','.wav','.ogg'))):
            print('lets get tha cover ourselves')
            directory = os.path.dirname(temp_artwork_get)
            print(f'{directory}\\artwork.png')
            if (os.path.isfile(f'{directory}\\cover.png')):
                get_cover = f'{directory}\\cover.png'
            elif (os.path.isfile(f'{directory}\\cover.jpg')):
                get_cover = f'{directory}\\cover.jpg'
            elif (os.path.isfile(f'{directory}\\artwork.png')):
                get_cover = f'{directory}\\artwork.png'
            elif (os.path.isfile(f'{directory}\\artwork.jpg')):
                get_cover = f'{directory}\\artwork.jpg'
            elif (os.path.isfile(f'{directory}\\folder.png')):
                get_cover = f'{directory}\\folder..png'
            elif (os.path.isfile(f'{directory}\\folder.jpg')):
                get_cover = f'{directory}\\folder.jpg'
        else:
            get_cover = temp_artwork_get

        print(get_cover)
        img = Image.open(get_cover)
        res_img = img.resize((600, 600))
        if res_img.mode in ('RGBA', 'P'):
            res_img = res_img.convert('RGB')
        output2 = BytesIO()
        res_img.save(output2, format="JPEG")
        return base64.b64encode(output2.getvalue()).decode('utf-8')
    except:
        print("invalid image")
        return -1

@eel.expose()
def get_artist_artwork(artist):
    working_dir = os.getcwd()
    if (os.path.isfile(f'{working_dir}\\web\\img\\artists\\{artist}.png')):
        get_cover = f'{working_dir}\\web\\img\\artists\\{artist}.png'

        img = Image.open(get_cover)
        res_img = img.resize((600, 600))
        output2 = BytesIO()
        res_img.save(output2, format="JPEG")
        return base64.b64encode(output2.getvalue()).decode('utf-8')
    else:
        return ''


@eel.expose()
def parse_file(rawrr,include_album=True,in_queue=-1):
    #print(mb.library_get_file_tag(rawrr,MBMD_TrackTitle), mb.library_get_file_tag(rawrr,MBMD_Album))
    if in_queue > -1:
        return {
            'position': in_queue,
            'title': mb.library_get_file_tag(rawrr,MBMD_TrackTitle),
            'artist': mb.library_get_file_tag(rawrr,MBMD_Artist),
            'album_artist': mb.library_get_file_tag(rawrr,MBMD_AlbumArtist),
            'guests': mb.library_get_file_tag(rawrr,MBMD_MultiArtist),
            'album': mb.library_get_file_tag(rawrr,MBMD_Album),
            'rawr': rawrr,
            'date': mb.library_get_file_tag(rawrr,MBMD_Year),
            'length': mb.library_get_file_property(rawrr,MBFP_Duration),
            'release': mb.library_get_file_tag(rawrr,MBMD_Custom4)
        }
    elif include_album:
        return {
            'position': mb.library_get_file_tag(rawrr,MBMD_TrackNo),
            'disc': mb.library_get_file_tag(rawrr,MBMD_DiscNo),
            'title': mb.library_get_file_tag(rawrr,MBMD_TrackTitle),
            'artist': mb.library_get_file_tag(rawrr,MBMD_Artist),
            'album_artist': mb.library_get_file_tag(rawrr,MBMD_AlbumArtist),
            'guests': mb.library_get_file_tag(rawrr,MBMD_MultiArtist),
            'album': mb.library_get_file_tag(rawrr,MBMD_Album),
            'rawr': rawrr,
            'date': mb.library_get_file_tag(rawrr,MBMD_Year),
            'length': mb.library_get_file_property(rawrr,MBFP_Duration),
            'release': mb.library_get_file_tag(rawrr,MBMD_Custom4)
        }
    else:
        return {
            'position': mb.library_get_file_tag(rawrr,MBMD_TrackNo),
            'disc': mb.library_get_file_tag(rawrr,MBMD_DiscNo),
            'title': mb.library_get_file_tag(rawrr,MBMD_TrackTitle),
            'artist': mb.library_get_file_tag(rawrr,MBMD_Artist),
            'album_artist': mb.library_get_file_tag(rawrr,MBMD_AlbumArtist),
            'guests': mb.library_get_file_tag(rawrr,MBMD_MultiArtist),
            'rawr': rawrr,
            'date': mb.library_get_file_tag(rawrr,MBMD_Year),
            'length': mb.library_get_file_property(rawrr,MBFP_Duration),
            'release': mb.library_get_file_tag(rawrr,MBMD_Custom4)
        }


@eel.expose()
def add_to_artists(append):
    with open('./web/js/artists.json', encoding='utf-8') as f:
        data = json.load(f)

    data.append(append)

    with open('./web/js/artists.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)

@eel.expose()
def modify_album_info(artist,album,rawr):
    with open('./web/js/albums.json', encoding='utf-8') as f:
        data = json.load(f)

    if artist not in data:
        data[artist] = {}

    if album not in data[artist]:
        data[artist][album] = {}

    data[artist][album] = rawr

    with open('./web/js/albums.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)


@eel.expose()
def get_queue_length():
    return mb.now_playing_list_get_item_count()

@eel.expose()
def get_queue_item_file_url(index):
    return mb.now_playing_list_get_list_file_url(index)


@eel.expose()
def queue_next(file_url):
    mb.queue_next(file_url)

@eel.expose()
def queue_last(file_url):
    mb.queue_last(file_url)

@eel.expose()
def queue_clear():
    mb.clear_now_playing_list()

@eel.expose()
def get_index():
    return mb.get_current_index()


# fingers crossed this is what i think
# it literally is a guessing game
@eel.expose()
def remove_queue_item(index):
    mb.remove_at(index)


@eel.expose()
def set_volume(volume):
    mb.set_volume(volume)


@eel.expose()
def set_loop_state(state):
    mb.set_repeat(state)

@eel.expose()
def set_shuffle_state(state):
    mb.set_shuffle(state)


#async def main():
#    await get_now_playing();

#async def forever():
#    while True:
#        await main()

#loop = asyncio.get_event_loop()
#loop.run_until_complete(forever())

#try:
eel.init('web')
eel.browsers.set_path('chrome', 'chrome-win/chrome.exe')
eel.start('index.html', size=(1400, 800))
#except OSError:
    #print(f"{Back.RED}{Style.BRIGHT}ERROR{Style.RESET_ALL} {Back.GREEN}{Style.BRIGHT}Google Chromium/Chrome{Style.RESET_ALL} is required to be installed.")