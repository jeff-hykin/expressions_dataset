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

# 
# performance statistics
# 
stats = {
    "video_frame_counts": [],
    "video_processing_times": [],
    "global_start_time": time.time(),
    "global_duration": 0,
    "number_of_successful_videos" : 0,
    "number_of_videos_attempted" : 0,
    "local_start_time": 0,
}

# grab some videos
stop_on_next_video = 0
for video_count, each_video in enumerate(VideoSelect().is_downloaded.then.has_basic_info.has_related_videos.retrive()):
    
    # logging
    stats["number_of_videos_attempted"] += 1
    stats["global_duration"] = time.time() - stats["global_start_time"]
    print(f"\n[   video={video_count}] {each_video.id}")
    
    # stop from keyboard
    if stop_on_next_video > 0:
        print('process_emotion successfully shutdown gracefully')
        break
    
    # videos shorter than 5 minutes
    if each_video["basic_info"]["duration"] < (5 * 60):
        try:
            stats["local_start_time"] = time.time()
            
            # each video frame
            for each_index, each_frame in enumerate(each_video.frames):
                try:
                    # logging
                    if each_index % 325 == 0:
                        print(f"\n[   frame={each_index}]",end="")
                    elif each_index % 25 == 0:
                        print(f"[frame={each_index}]",end="")
                        sys.stdout.flush()
                    
                    # actual machine learning usage
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
                    
                    # saves each frame info to database
                    each_video["frames", each_index, "faces_haarcascade_0-0-2"] = face_data
                    
                except KeyboardInterrupt:
                    print('\nGot the message, stopping on video completion\nkeep interrupting to force cancel midway')
                    stop_on_next_video += 1
                    # if the user says to end repeatedly
                    if stop_on_next_video > 5:
                        # stop immediately, causing partially bad data
                        exit(0)
            # 
            # stats
            # 
            stats["number_of_successful_videos"] += 1
            stats["video_frame_counts"].append(each_index)
            stats["video_processing_times"].append( time.time() - stats["local_start_time"] )
            FS.write(json.dumps(stats), to="./process_emotion.stats.nosync.json")
        
        except KeyboardInterrupt:
            exit(0)
        
        # skip videos that can't be downloaded/processed for whatever reason
        except Exception as the_exception:
            print(f"[video select] {each_video.id} hit an error while in processing_emotion...skipping")
            print(f'[exception] {the_exception}')
            continue