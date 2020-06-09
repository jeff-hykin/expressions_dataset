from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__), '..', 'toolbox', 'tools.py')).read_text())

# grab some videos
for each_video in VideoSelect().is_downloaded.then.has_basic_info.has_related_videos.retrive():
    # videos shorter than 5 minutes
    if each_video["basic_info"]["duration"] < (5 * 60):
        new_frame_data = {}
        # label get all the frames 
        for each_index, each_frame in enumerate(each_video.frames()):
            # save the data on a per-frame basis
            new_frame_data[each_index] = { "emotion_0.0.1" : predict_emotion(each_frame) }
        # send the updated information to the database
        each_video.merge_data({"frames": new_frame_data })