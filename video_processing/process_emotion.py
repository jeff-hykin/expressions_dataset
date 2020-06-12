from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__), '..', 'toolbox', 'tools.py')).read_text())

# get the emotion tools
from toolbox.face_tools.expressions.Facial_expressions_detection import network_output as get_emotion_data
from toolbox.face_tools.expressions.Facial_expressions_detection import preprocess_face

face_cascade = cv.CascadeClassifier(paths['haarcascade_frontalface_default'])
def get_faces(image):
    face_dimensions = face_cascade.detectMultiScale(image, scaleFactor=1.1, minNeighbors=1, minSize=(100, 100), flags=cv.CASCADE_SCALE_IMAGE)
    cropped_faces = [ image[y:y + h, x:x + w] for x, y, w, h in face_dimensions ]
    return cropped_faces, face_dimensions
    
# grab some videos
for video_count, each_video in enumerate(VideoSelect().is_downloaded.then.has_basic_info.has_related_videos.retrive()):
    print(f"[   video={video_count}] {each_video.id}")
    # videos shorter than 5 minutes
    if each_video["basic_info"]["duration"] < (5 * 60):
        try:
            for each_index, each_frame in enumerate(each_video.frames):
                if each_index % 325 == 0:
                    print(f"\n[   frame={each_index}]",end="")
                elif each_index % 25 == 0:
                    print(f"[frame={each_index}]",end="")
                    sys.stdout.flush()
                face_images, dimensions = get_faces(each_frame)
                face_data = []
                for each_face_img, each_dimension in zip(face_images, dimensions):
                    face_data.append({
                        "x" : int(each_dimension[0]),
                        "y" : int(each_dimension[1]),
                        "width" : int(each_dimension[2]),
                        "height" : int(each_dimension[3]),
                        "emotion_vgg19_0-0-2" : get_emotion_data(preprocess_face(each_face_img)),
                    })
                # save the results of the frame to the database
                each_video["frames", each_index, "faces_haarcascade_0-0-2"] = face_data
        except KeyboardInterrupt:
            exit(0)
        # skip videos that can't be downloaded
        except Exception as the_exception:
            print(f"[video select] {each_video.id} hit an error while in processing_emotion...skipping")
            print(f'[exception] {the_exception}')
            continue

        # send the updated information to the database
        # each_video.merge_data({"frames": new_frame_data })