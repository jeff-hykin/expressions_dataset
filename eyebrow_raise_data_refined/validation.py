from pathlib import Path
from os.path import join, dirname
import matplotlib.pyplot as plt
exec(Path(join(dirname(__file__),'..', 'face_detection', 'tools.py')).read_text())


def scale_0_to_100(a_list):
    min_score = min(a_list)
    shifted_scores = [ each - min_score for each in a_list ]
    max_score = max(shifted_scores)
    scale_to_100 = 100.0 / max_score
    adjusted_scores = [ each * scale_to_100 for each in shifted_scores ]
    return adjusted_scores

# create a figure for showing performance

here = dirname(__file__)

for video_index, each_video_path in enumerate(FS.list_files(paths["raised_eyebrows_videos"])):
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
        
        frames = list(all_frame_data.values())
        
        # if there is hand-picked data for the video
        if all( each.get("handpicked_eyebrow_score", None) != None for each in frames):
            # 
            # plot the data
            # 
            # create a new graph for each video
            plt.figure(video_index)
            # graph each aspect
            for each_term in [ "handpicked_eyebrow_score", "mouth_openness" ]:
                plt.plot( [ each_frame[each_term] for each_frame in frames ], label=each_term )
            
            # scale the eyebrow score 
            plt.plot(
                scale_0_to_100([ each_frame["eyebrow_raise_score"] for each_frame in frames ]),
                label="eyebrow_raise_score"
            )
            plt.legend(loc='best')

# show all the videos
plt.show()