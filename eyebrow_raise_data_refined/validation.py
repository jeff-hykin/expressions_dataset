from pathlib import Path
from os.path import join, dirname
import matplotlib.pyplot as plt
exec(Path(join(dirname(__file__),'..', 'face_detection', 'tools.py')).read_text())


# create a figure for showing performance
plt.figure(1)

here = dirname(__file__)

for each_video_path in FS.list_files(paths["raised_eyebrows_videos"]):
    # 
    # get the JSON data for each video
    # 
    *folders, video_filename, extension = FS.path_peices(each_video_path)
    each_video = Video(each_video_path)
    json_file_path = FS.join(here, video_filename, 'info.json')
    all_frame_data = {}
    # if the json already exists, pull in the data
    if FS.exists(json_file_path):
        with open(json_file_path) as json_file:
            all_frame_data = json.load(json_file)
        
        frames = all_frame_data.items()
        
        # if there is hand-picked data for the video
        if all( each.get("raised", None) != None for each in frames):
            # 
            # plot the data
            # 
            # create a subplot
            plt.subplot(random.random())
            scores = [
                # the hand-picked score
                [ each["raised"] for each in frames ],
                # the eyebrow height
                [ each["eyebrow_raise_score"] for each in frames ],
                # the mouth openness
                [ each["mouth_openness"] for each in frames ],
            ]
            for each in scores:
                plt.plot(each)

# show all the videos
plt.show()