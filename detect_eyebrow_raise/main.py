from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__),'..', 'face_detection', 'tools.py')).read_text())

eyebrow_locations = []
for each_video_path in FS.list_files(paths["raised_eyebrows_videos"]):
    each_video = Video(each_video_path)
    # load the video and break it up into frames
    for each_frame in each_video.frames():
        faces = faces_for(each_frame)
        # assume only 1 face
        if len(faces) > 0:
            face = faces[0]
            left_eyebrow = face.left_eyebrow()
            right_eyebrow = face.right_eyebrow()
            print('left_eyebrow = ', right_eyebrow)
            print('right_eyebrow = ', right_eyebrow)
        break
    break



# faces = faces_for(dlib.load_rgb_image("./face/faces/person.jpg"))
# faces = aligned_faces_for(img, size=800, padding=0.25)