import os
import struct
from musicbeeipc import *
import asyncio
import time
import eel
import eel.browsers

# for logging on py side
# can remove
from colorama import init
from colorama import Fore, Back, Style
init()

mb = MusicBeeIPC()

@eel.expose()
def get_now_playing():
    print(f"{Back.RED}{Style.BRIGHT}{mb.get_file_tag(MBMD_Artist)}{Style.RESET_ALL} {Back.BLUE}{Style.BRIGHT}{mb.get_file_tag(MBMD_TrackTitle)}{Style.RESET_ALL} {Back.YELLOW}{Style.BRIGHT}{mb.get_file_tag(MBMD_Album)}{Style.RESET_ALL}")
    print(f"{Back.GREEN}{Style.BRIGHT}{mb.get_play_state_str()}{Style.RESET_ALL} / Time: {mb.get_position()} of {mb.get_duration()}")

    send = {
        'file': {
            'track': {
                'title': mb.get_file_tag(MBMD_TrackTitle),
                'artist': mb.get_file_tag(MBMD_Artist),
                'guests': mb.get_file_tag(MBMD_ArtistsWithGuestRole)
            },
            'album': {
                'title': mb.get_file_tag(MBMD_Album),
                'artist': mb.get_file_tag(MBMD_AlbumArtist),
                'cover': mb.get_artwork_url()
            }
        },
        'status': {
            'state': mb.get_play_state_str(),
            'time': {
                'position': mb.get_position(),
                'duration': mb.get_duration()
            }
        }
    }

    print (send)
    return send

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