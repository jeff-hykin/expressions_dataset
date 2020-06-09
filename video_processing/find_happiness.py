from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__), '..', 'toolbox', 'tools.py')).read_text())
from toolbox.face_tools.expressions.Facial_expressions_detection import label as get_face_emotions

# grab some videos
for each_video in VideoSelect().is_downloaded.then.has_basic_info.has_related_videos.retrive():
    print('each_video.data = ', each_video.data)
    # videos shorter than 5 minutes
    if each_video["basic_info"]["duration"] < (5 * 60):
        new_frame_data = {}
        # label get all the frames 
        for each_index, each_frame in enumerate(each_video.frames):
            print('each_index = ', each_index)
            # save the data on a per-frame basis
            new_frame_data[each_index] = { "emotion_0.0.1" : get_face_emotions(each_frame) }
            # FIXME: Debugging 
            print('new_frame_data = ', new_frame_data)
            Image(each_frame).save(to="./test_image")
            print('saved image')
            exit()

        # send the updated information to the database
        # FIXME: Debugging 
        # each_video.merge_data({"frames": new_frame_data })