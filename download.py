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
import hashlib

# pip dependencies
    # youtube-dl (pip)

# how to use
    # run:
    #   python3 download.py *name_of_csv_file*
    # the csv file should be formatted as:
    #   *label_name*, *youtube url*, *start time (seconds)*, *end time (seconds)*
    # and the first entry in the CSV should be the headers, not an actual entry
    


# 
# hardcoded names
# 
CACHE_DIR     = 'video_cache.nosync'
OUTPUT_FOLDER = 'clips.nosync'


# 
# helpers
#
    

def hash(string):
    return hashlib.md5(string.encode()).hexdigest()

def delete(filepath):
    try:
        os.remove(str(filepath))
    except:
        pass

CACHE_DIR = 'video_cache.nosync'
def download_video(url=None):
    global CACHE_DIR
    hash_value = hash(url)
    video_file = join(CACHE_DIR, hash_value+".mp4")
    if not isfile(video_file):
        # run the downloader
        call(["youtube-dl", url, "-f", 'bestvideo[ext=mp4]', "-o" , video_file])
    
    return video_file
    
def cut_video(source, start, end, output_path):
    duration = end - start
    if duration <= 0:
        raise Exception("duration screwed up for "+source)
    call(["ffmpeg", "-i", str(source), "-ss", str(start), "-t", str(duration), "-async", "1", str(output_path), "-hide_banner", "-loglevel", "panic"])

def parse_time(time_as_string):
    time_as_string = time_as_string.strip()
    
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
# Process the file
#
try:
    with open(path_to_csv,'r') as f:
        file_contents = f.read()
except:
    file_contents = None

# remove blank lines
file_contents = re.sub(r'\n\s*(\n\s*)+', "\n", file_contents)
# split into lines
lines = file_contents.split("\n")
# remove header
headers, *lines = lines
# split up the comma seperated values
data = []
for each in lines:
    data.append(each.split(","))

# 
# process each clip
# 
# iterate over the rows
for each_index, each_row in enumerate(data):
    print("\n====================================")
    print("on item "+str(each_index+1)+" of "+str(len(data)))
    print("====================================\n")
    
    # skip empty rows
    if len(each_row) == 0:
        continue
    
    # extract the data from the row
    label, url, start_time, end_time = each_row
    start_time  = parse_time(start_time)
    end_time    = parse_time(end_time)
    # download it
    path_to_full_video = download_video(url=url)
    # generate the name, and see if it's alread been created
    unique_clip_name = hash(url+str(start_time)+str(end_time)+str(label))
    clip_path = join(OUTPUT_FOLDER, label, unique_clip_name+".mp4")
    if not isfile(clip_path):
        try:
            # make sure the containing folder exists
            makedirs(dirname(clip_path))
        except:
            pass
        # clip the video to the right amount of time
        cut_video(path_to_full_video, start_time, end_time, clip_path)