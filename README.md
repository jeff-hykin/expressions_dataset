# Expression Dataset

## Requirements
- Make sure your system has python3 installed, I'm using Python `3.7.3`
- Install the `youtube-dl` pip module, I'm using version `2019.07.27`
- Install the `ffmpeg` library. On Mac, if you have homebrew its as easy as `brew install ffmpeg`
- clone the github repo, and cd to it

## How to Download Videos
To download the videos, all you have to do is run `python3 download.py videos.csv` and they should download.
If you stop the command and then resume it later, it will detect which videos are already downloaded and will only download the new ones.

## How to Add Videos
For example, lets say I found a "smile" expression, in the first 5 seconds of this video:
`https://www.youtube.com/watch?v=y18W1N6mR88`
To get this be downloaded, I'd open the `videos.csv` file and add the following line:
`smile, https://www.youtube.com/watch?v=y18W1N6mR88, 0, 5`
The 0 and 5 are the start and end times of the clip. They can be formatted as hh:mm:ss.

## How the Code Works
The program gets the path of the CSV file from its arguments.
```python
path_to_csv = sys.argv[1]
```
Then it converts the csv file into a list of rows, and each row is a list of elements
```python
def parse_csv(filepath):
    # read the file as a string
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
    return data

```
Each row is then broken down into its label, url, start_time, and end_time
```python
data = parse_csv(path_to_csv)
for each_index, each_row in enumerate(data):
    # extract the data from the row
    label, url, start_time, end_time = each_row
```
The video is downloaded to a video cache if it is not already downloaded.
The filename of the video is created by hashing the url since each url is unique.
```python
def hash(string):
    return hashlib.md5(string.encode()).hexdigest()

CACHE_DIR = 'video_cache.nosync'
def download_video(url=None):
    global CACHE_DIR
    hash_value = hash(url)
    video_file = join(CACHE_DIR, hash_value+".mp4")
    if not isfile(video_file):
        # run the downloader
        call(["youtube-dl", url, "-f", 'bestvideo[ext=mp4]', "-o" , video_file])
    
    return video_file
```
The start and end time are strings, so they need to be parsed and converted to numbers.
This is the function that parses them. It expects a hour:minute:second format.
The hours and minutes are optional, theres also the ability to use a pipe | to indicate the begining or end of the second
```python
def parse_time(time_as_string):
    # remove any whitespace
    time_as_string = time_as_string.strip()
    
    # find the hour min and second using regex
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
```
Now that the video has been downloaded, it needs to be clipped to the correct size.
This is done using a system call to the ffmpeg library which does all the heavy work.
This produces a new video at the output path without changing the original video
```python
def cut_video(source, start, end, output_path):
    duration = end - start
    if duration <= 0:
        raise Exception("duration screwed up for "+source)
    call(["ffmpeg", "-i", str(source), "-ss", str(start), "-t", str(duration), "-async", "1", str(output_path), "-hide_banner", "-loglevel", "panic"])
```
To get a name for the video, the hash function is used with the times, url, and label since that is what makes a clip unique.
```python
unique_clip_name = hash(url+str(start_time)+str(end_time)+str(label))
```
The clip needs to be organized, so we place it inside of a folder with the same name as the label.
To do this we can use the `makedirs()` function.
```python
clip_path = join(OUTPUT_FOLDER, label, unique_clip_name+".mp4")
try:
    # make sure the containing folder exists
    makedirs(dirname(clip_path))
except:
    pass
```
Putting all of theses peices together, here's what the final loop looks like.
We also add a check to not cut a video if the cut already exists.
```python
for each_index, each_row in enumerate(data):
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
```