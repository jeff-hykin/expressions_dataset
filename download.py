import sys
import os
from os.path import isabs, isfile, isdir, join, dirname, basename, exists, splitext, relpath
from os import remove, getcwd, makedirs, listdir, rename, rmdir, system
from shutil import move
import glob
import regex as re
import numpy as np
import pickle
import random
import itertools
import time
import subprocess
from subprocess import call
from moviepy.video.io.ffmpeg_tools import ffmpeg_extract_subclip
import hashlib

# pip dependencies
    # youtube-dl (pip)
    # moviepy

# 
# hardcoded names
# 
CACHE_DIR     = 'video_cache.nosync'
LOG_PATH      = '.video_download_progress.nosync.log'
OUTPUT_FOLDER = 'clips.nosync'


# 
# helpers
# 
def hash(string):
    return hashlib.md5(string.encode()).hexdigest()

def download_video(url=None):
    global CACHE_DIR
    video_file = join(CACHE_DIR, hash(url)+".mp4")
    # if it hasn't been downloaded yet
    if not isfile(video_file):
        # run the downloader
        call(["youtube-dl", url, "-o" , video_file])
    return video_file

def parse_time(time_as_string):
    
    # patterns
    time_pattern = r'((?P<hour>\d+(?=:\d+:)):)?((?P<min>\d+):)?(?P<sec>\d+)'
    bar_pattern = r'\|'
    
    # get the time
    result = re.search(time_pattern, time_as_string)
    # make sure the time is valid
    if result == None:
        raise "There's an invalid time: "+time
    # convert to seconds integer
    hour   = int(result["hour"] or 0) 
    minute = int(result["min"] or 0)
    second = int(result["sec"])
    seconds = (hour * 3600) + (minute * 60) + second
    
    # check if bar on righthand side e.g. 40|
    result = re.match(time_pattern+bar_pattern, time_as_string)
    if result != None:
        seconds += 1
    return seconds


# 
# get commandline options
# 
if len(sys.argv) < 2:
    print("Hey, this needs a path to a csv file as its first argument")
path_to_csv = sys.argv[1]


# 
# Check if resuming a download
# 
have_not_yet_done_number = 0
try:
    with open(LOG_PATH,'r') as f:
        have_not_yet_done_number = int(f.read())
except:
    pass

# 
# process each clip
# 
import csv
with open(path_to_csv, 'r') as csvfile:
    csvreader = csv.reader(csvfile)
    # skip the header row
    next(csvreader)
    # iterate over the rows
    for each_index, each_row in enumerate(csvreader):
        # skip the ones that are already downloaded
        if have_not_yet_done_number > each_index:
            continue

        label, url, start_time, end_time = each_row
        start_time  = parse_time(start_time)
        end_time    = parse_time(end_time)
        # download it
        path_to_full_video = download_video(url=url)
        
        video_clip_name = join(OUTPUT_FOLDER, label, str(each_index+1)+".mp4")
        # remove/overwrite files that were there before (most likely corrupted/incorrect if overwriting)
        try:
            remove(video_clip_name)
        except:
            pass
        # chop it up and save it
        makedirs(dirname(video_clip_name))
        ffmpeg_extract_subclip(path_to_full_video, start_time, end_time, targetname=video_clip_name)
        
        # keep track of the which index has not yet been done (for resuming later)
        with open(LOG_PATH, 'w') as the_file:
            the_file.write(str(each_index+1))

# remove the log path after everything has been downloaded
try:
    remove(LOG_PATH)
except:
    pass