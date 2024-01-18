import os
import struct
from musicbeeipc import *
import asyncio
import time
import eel
import eel.browsers
import base64

# for logging on py side
# can remove
from colorama import init
from colorama import Fore, Back, Style
init()

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
            with open(temp_artwork, 'rb') as image:
                last_known_b64 = base64.b64encode(image.read()).decode("utf-8")
            last_known_artwork = temp_artwork
        except FileNotFoundError:
            print("artwork does not exist?")

    send = {
        'file': {
            'track': {
                'title': mb.get_file_tag(MBMD_TrackTitle),
                'artist': mb.get_file_tag(MBMD_Artist),
                'guests': mb.get_file_tag(MBMD_ArtistsWithGuestRole),
                'loved': mb.get_file_tag(MBMD_RatingLove)
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
def get_artist_library(artist=''):
    rawr = mb.library_search(query=artist,fields=['ArtistPeople'])
    meow = {}

    for item in rawr:
        album = mb.library_get_file_tag(rawr[item],MBMD_Album)
        if album not in meow:
            meow[album] = []

        meow[album].append(parse_file(rawr,False))

    return meow


@eel.expose()
def parse_file(rawr,include_album=True):
    if include_album:
        return {
            'title': mb.library_get_file_tag(rawr,MBMD_TrackTitle),
            'artist': mb.library_get_file_tag(rawr,MBMD_Artist),
            'guests': mb.library_get_file_tag(rawr,MBMD_ArtistsWithGuestRole),
            'album': mb.library_get_file_tag(rawr,MBMD_Album)
        }
    else:
        return {
            'title': mb.library_get_file_tag(rawr,MBMD_TrackTitle),
            'artist': mb.library_get_file_tag(rawr,MBMD_Artist),
            'guests': mb.library_get_file_tag(rawr,MBMD_ArtistsWithGuestRole)
        }

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
eel.start('index.html', size=(1300, 700))
#except OSError:
    #print(f"{Back.RED}{Style.BRIGHT}ERROR{Style.RESET_ALL} {Back.GREEN}{Style.BRIGHT}Google Chromium/Chrome{Style.RESET_ALL} is required to be installed.")