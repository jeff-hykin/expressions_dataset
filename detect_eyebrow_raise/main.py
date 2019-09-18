from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__),'..', 'face_detection', 'tools.py')).read_text())
eyebrow_locations = []

# TODO:
    # scale it by the height of the face (top most of face vs bottom most)
    # switch to using min of the eye-to-eyebrow distance
for each_video_path in FS.list_files(join(dirname(__file__),"../clips.nosync/raised_eyebrows")):
    each_video = Video(each_video_path)
    # load the video and break it up into frames
    for each_frame in each_video.frames():
        faces = faces_for(each_frame)
        # assume only 1 face
        if len(faces) > 0:
            face = faces[0]
            height_of_left, height_of_right = face.eyebrow_height()
            
            print('height_of_left, height_of_right = ', height_of_left, height_of_right)
        break
    break
