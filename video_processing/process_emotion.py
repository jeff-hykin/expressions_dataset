from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__), '..', 'toolbox', 'tools.py')).read_text())

# get the emotion tools
from toolbox.face_tools.expressions.Facial_expressions_detection import network_output as get_emotion_data
from toolbox.face_tools.expressions.Facial_expressions_detection import preprocess_face

SAVE_TO_DATABASE = True
SAVE_EACH_VIDEO_TO_FILE = False

face_cascade = cv.CascadeClassifier(paths['haarcascade_frontalface_default'])
def get_faces(image):
    face_dimensions = face_cascade.detectMultiScale(image, scaleFactor=1.1, minNeighbors=1, minSize=(100, 100), flags=cv.CASCADE_SCALE_IMAGE)
    cropped_faces = [ image[y:y + h, x:x + w] for x, y, w, h in face_dimensions ]
    return cropped_faces, face_dimensions

# 
# performance statistics
# 
stats = {
    "videos_processed": [],
    "global_start_time": time.time(),
    "global_duration": 0,
    "number_of_successful_videos" : 0,
    "number_of_videos_attempted" : 0,
    "local": {
        "start_time": 0,
        "face_frame_count": 0,
        "find_faces_start_time": 0,
        "find_faces_duration" : 0, 
        "find_emotion_start_time": 0,
        "find_emotion_duration" : 0, 
        "find_emotion_duration" : 0, 
        "database_start_save_time": 0,
        "database_save_duration": 0,
    }
}

# grab some videos
print("retriving videos")
stop_on_next_video = 0
for video_count, each_video in enumerate(VideoSelect().has_basic_info.has_related_videos.retrive()):
    # get info from the database
    video_data = {}
    video_data["basic_info"] = each_video["basic_info"]
    video_data["messages"] = video_data.get("messages", {})
    video_data["messages"]["running_processes"] = video_data.get("messages", {}).get("running_processes", [])
    video_data["frames"] = {}
    
    # logging
    stats["number_of_videos_attempted"] = video_count
    stats["global_duration"] = time.time() - stats["global_start_time"]
    approximate_frame_count = video_data["basic_info"]["duration"] * video_data["basic_info"]["fps"]
    print(f"\n\n[   video={video_count}][approximate_frame_count={approximate_frame_count}] {each_video.id}")
    
    # stop from keyboard
    if stop_on_next_video > 0:
        print('process_emotion successfully shutdown gracefully')
        break
    
    # videos shorter than 5 minutes
    if video_data["basic_info"]["duration"] < (5 * 60):
        try:
            stats["local"] = {
                "start_time": time.time(),
                "face_frame_count": 0,
                "find_faces_start_time": 0,
                "find_faces_duration" : 0, 
                "find_emotion_start_time": 0,
                "find_emotion_duration" : 0,
                "database_start_save_time": 0,
                "database_save_duration": 0,
            }
            
            # each video frame
            for each_index, each_frame in enumerate(each_video.frames):
                try:
                    # make sure the frame is a dict
                    video_data["frames"][each_index] = video_data["frames"].get(each_index, {})
                    
                    # logging
                    if each_index % 325 == 0:
                        print(f"\n[   frame={each_index}]",end="")
                    elif each_index % 25 == 0:
                        print(f"[frame={each_index}]",end="")
                        sys.stdout.flush()
                    
                    stats["local"]["find_faces_start_time"] = time.time()
                    
                    # actual machine learning usage
                    face_images, dimensions = get_faces(each_frame)
                    face_data = []
                    
                    # more stats
                    stats["local"]["find_faces_duration"]     += time.time() - stats["local"]["find_faces_start_time"]
                    stats["local"]["face_frame_count"]        += 1 if len(face_images) > 1 else 0
                    stats["local"]["find_emotion_start_time"]  = time.time()
                    
                    # tell the database a video is being processed encase it fails in the middle and corrupts data
                    # check if the field exists
                    process_name = "faces_haarcascade_0-0-2"
                    # set the data on the database
                    video_data["messages"]["running_processes"].append(process_name)
                    each_video["messages", "running_processes"] = video_data["messages"]["running_processes"]
                    
                    for each_face_img, each_dimension in zip(face_images, dimensions):
                        face_data.append({
                            "x" : int(each_dimension[0]),
                            "y" : int(each_dimension[1]),
                            "width" : int(each_dimension[2]),
                            "height" : int(each_dimension[3]),
                            "emotion_vgg19_0-0-2" : get_emotion_data(preprocess_face(each_face_img)),
                        })
                    
                    # stats
                    stats["local"]["find_emotion_duration"] += time.time() - stats["local"]["find_emotion_start_time"]
                    
                    # save the data to variable (later written to file)
                    video_data["frames"][each_index]["faces_haarcascade_0-0-2"] = face_data
                    # save the data to databse
                    if SAVE_TO_DATABASE:
                        stats["local"]["database_start_save_time"] = time.time()
                        each_video["frames", each_index, "faces_haarcascade_0-0-2"] = face_data
                        stats["local"]["database_save_duration"]  += time.time() - stats["local"]["database_start_save_time"]
                    
                except KeyboardInterrupt:
                    print('\nGot the message, stopping on video completion\nkeep interrupting to force cancel midway')
                    stop_on_next_video += 1
                    # if the user says to end repeatedly
                    if stop_on_next_video > 5:
                        # stop immediately, causing partially bad data
                        exit(0)
            # 
            # cleanup
            #
            
            # get processes from database
            video_data["messages"]["running_processes"] = each_video["messages", "running_processes"]
            # remove this process since its finished
            video_data["messages"]["running_processes"] = [ each for each in video_data["messages"]["running_processes"] if each != process_name ]
            # set the data on the database
            each_video["messages", "running_processes"] = video_data["messages"]["running_processes"]
            
            # 
            # stats
            # 
            stats["number_of_successful_videos"] += 1
            stats["videos_processed"].append({
                each_video.id : {
                    "frame_count"           : each_index,
                    "processing_time"       : time.time() - stats["local"]["start_time"],
                    "face_frame_count"      : stats["local"]["face_frame_count"],
                    "find_faces_duration"   : stats["local"]["find_faces_duration"],
                    "find_emotion_duration" : stats["local"]["find_emotion_duration"],
                    "database_save_duration": stats["local"]["database_save_duration"],
                }
            })
            FS.write(yaml.dump(stats, default_flow_style=False), to=paths["process_emotion_stats"])
            # save video data to file
            if SAVE_EACH_VIDEO_TO_FILE:
                FS.write(json.dumps(video_data), to=FS.join(paths["video_cache"], each_video.id+".json"))
            
        
        except KeyboardInterrupt:
            exit(0)
        
        # skip videos that can't be downloaded/processed for whatever reason
        except Exception as the_exception:
            print(f"[video select] {each_video.id} hit an error while in processing_emotion...skipping")
            print(f'[exception] {the_exception}')
            continue