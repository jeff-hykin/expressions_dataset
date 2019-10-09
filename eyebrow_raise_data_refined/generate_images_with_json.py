from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__),'..', 'face_detection', 'tools.py')).read_text())

here = dirname(__file__)

# parameters
how_often_to_pull_frames = 10



for each_video_path in FS.list_files(paths["raised_eyebrows_videos"]):
    *folders, video_filename, extension = FS.path_peices(each_video_path)
    each_video = Video(each_video_path)
    
    json_file_path = FS.join(here, video_filename, 'info.json')
    allFrameData = {}
    # if the json already exists, pull in the data
    if FS.exists(json_file_path):
        with open(json_file_path) as json_file:
            allFrameData = json.load(json_file)
    # load the video and break it up into frames
    for frame_index, each_frame in enumerate(each_video.frames()):
        # only save particular frames
        if each_frame is not None and frame_index % how_often_to_pull_frames == 0:
            faces = faces_for(each_frame)
            # assume only 1 face
            if len(faces) > 0:
                image             = Image(each_frame)
                face              = faces[0]
                
                # save the frame as an image
                # FIXME: temp disable
                # image_location = FS.join(here, video_filename, str(frame_index))
                # image.save(to=image_location, image_type="png")
                
                facial_landmarks = [
                    # left eyebrow
                    17,18,19,20,21,
                    # left eye
                    36, 37, 38, 39,
                    # right eyebrow
                    22, 23, 24, 25, 26,
                    # right eye
                    42, 43, 44, 45,
                ]
                points = []
                frame_image_name = str(frame_index)+".png"
                
                # make sure the structure exists 
                if allFrameData.get(frame_image_name, None) == None:
                    allFrameData[str(frame_index)+".png"] = {}
                if allFrameData[frame_image_name].get("overlays", None) == None:
                    allFrameData[frame_image_name]["overlays"] = {}
                
                # add the eyebrow raised value to the frame data
                allFrameData[frame_image_name]["eyebrow_raise_score_2"] = face.eyebrow_raise_score()
                
                # generate the points in the correct format for displaying
                for each_index in facial_landmarks:
                    each = face.as_array[each_index]
                    points.append({
                        "uniqueName": each_index,
                        "type" : "point",
                        "x": int(each[0]),
                        "y": int(each[1]),
                    })
                # save the facial points
                allFrameData[frame_image_name]["overlays"] = points

    # save details
    with open(FS.join(here, video_filename, 'info.json'), 'w') as json_file:
        json.dump(allFrameData, json_file)



# how to verify data
    # 1. get points onto an image
    # 2. crop the image to the eyebrow section
    # 3. allow video playback of image crop
    # 4. allow pausing/rewinding of video
    # 5. allow for mouse correction of points