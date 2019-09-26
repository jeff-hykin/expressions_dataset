from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__),'..', 'face_detection', 'tools.py')).read_text())

for each_video_path in FS.list_files(join(dirname(__file__),"../clips.nosync/raised_eyebrows")):
    each_video = Video(each_video_path)
    # load the video and break it up into frames
    for index, each_frame in enumerate(each_video.frames()):
        faces = faces_for(each_frame)
        # assume only 1 face
        if len(faces) > 0:
            face = faces[0]
            image = Image(each_frame)
            image_with_points = image.with_points(face.as_array)
            location = FS.join(dirname(__file__),'..',"face_point_editor/images/", str(index))
            image.save(to=location, image_type="png")
            # height_of_left, height_of_right = face.eyebrow_height()
            # print('height_of_left, height_of_right = ', height_of_left, height_of_right)
        break
    break



# how to verify data
    # 1. get points onto an image
    # 2. crop the image to the eyebrow section
    # 3. allow video playback of image crop
    # 4. allow pausing/rewinding of video
    # 5. allow for mouse correction of points