from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__),'..', '..', 'toolbox', 'tools.py')).read_text())

here = dirname(__file__)

# parameters
how_often_to_pull_frames = 10



for each_video_path in FS.list_files(paths["raised_eyebrows_videos"]):
    *folders, video_filename, extension = FS.path_pieces(each_video_path)
    each_video = Video(each_video_path)
    
    json_file_path = FS.join(here, video_filename, 'info.json')
    all_frame_data = {}
    # if the json already exists, pull in the data
    if FS.exists(json_file_path):
        with open(json_file_path) as json_file:
            all_frame_data = json.load(json_file)
    # load the video and break it up into frames
    for frame_index, each_frame in enumerate(each_video.frames()):
        # only save particular frames
        if each_frame is not None and frame_index % how_often_to_pull_frames == 0:
            faces = faces_for(each_frame)
            # assume only 1 face
            if len(faces) > 0:
                image             = Image(each_frame)
                face              = faces[0]
                
                # save the frame as an image (temporarily disabled)
                image_location = FS.join(here, video_filename, str(frame_index))
                if not FS.is_file(image_location):
                    image.save(to=image_location, image_type="png")
                
                # make sure the JSON structure exists 
                frame_image_name = str(frame_index)+".png"
                if all_frame_data.get(frame_image_name, None) == None:
                    all_frame_data[frame_image_name] = {}
                if all_frame_data[frame_image_name].get("overlays", None) == None:
                    all_frame_data[frame_image_name]["overlays"] = {}
                
                # eyebrow score
                all_frame_data[frame_image_name]["eyebrow_raise_score"] = face.eyebrow_raise_score()
                
                # mouth score
                all_frame_data[frame_image_name]["mouth_openness"] = face.mouth_openness()

                # save the facial points
                points = []
                all_frame_data[frame_image_name]["overlays"] = points
                
                # 
                # attach facial_landmarks as points
                # 
                facial_landmarks = [
                    # left eyebrow
                    17,18,19,20,21,
                    # left eye
                    # 36, 37, 38, 39, 40, 41,
                    # right eyebrow
                    22, 23, 24, 25, 26,
                    # right eye
                    # 42, 43, 44, 45, 46, 47,
                    # inside of mouth
                    61, 62, 63,
                    67, 66, 65,
                ]
                for each_index in facial_landmarks:
                    each = face.as_array[each_index]
                    points.append({
                        "uniqueName": each_index,
                        "type" : "point",
                        "x": int(each[0]),
                        "y": int(each[1]),
                    })
                
                # 
                # show the center of the eyes as points
                # 
                if True:
                    # right eye
                    right_eye_center = face.right_eye_center()
                    points.append({
                        "uniqueName": "center_of_right_eye",
                        "type" : "point",
                        "x": int(right_eye_center[0]),
                        "y": int(right_eye_center[1]),
                    })
                    # left eye
                    left_eye_center = face.left_eye_center()
                    points.append({
                        "uniqueName": "center_of_left_eye",
                        "type" : "point",
                        "x": int(left_eye_center[0]),
                        "y": int(left_eye_center[1]),
                    })

    # save details
    with open(FS.join(here, video_filename, 'info.json'), 'w') as json_file:
        json.dump(all_frame_data, json_file)



# how to verify data
    # 1. get points onto an image
    # 2. crop the image to the eyebrow section
    # 3. allow video playback of image crop
    # 4. allow pausing/rewinding of video
    # 5. allow for mouse correction of points