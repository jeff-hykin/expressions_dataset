from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__),'..', 'face_detection', 'tools.py')).read_text())
from sklearn.svm import SVC
here = dirname(__file__)


HOW_OFTEN_TO_PULL_FRAMES = 10

# 
# Setup Data
# 

def yield_video_data(frame_lookback=9, minimum_face_size=200):
    # this is to make up for including the current frame
    frame_lookback += 1

    for each_video_path in FS.list_files(paths["raised_eyebrows_videos"]):
        *folders, video_filename, extension = FS.path_peices(each_video_path)
        each_video = Video(each_video_path)
        
        json_file_path = FS.join(here, video_filename, 'info.json')
        all_frame_data = {}
        # if the json already exists, pull in the data
        if FS.exists(json_file_path):
            with open(json_file_path) as json_file:
                all_frame_data = json.load(json_file)
        
        previous_frames = []
        # load the video and break it up into frames
        for frame_index, each_frame in enumerate(each_video.frames()):
            # collect frames if there is room
            if len(previous_frames) <= frame_lookback:
                previous_frames.append(each_frame)
            # remove oldest frame if now overflowing
            if len(previous_frames) > frame_lookback:
                previous_frames.pop(0)
            # when hitting the frame that was recorded
            if each_frame is not None and frame_index % HOW_OFTEN_TO_PULL_FRAMES == 0:
                # if there are enough frames for a lookback
                if len(previous_frames) == frame_lookback:
                    # 
                    # get the label
                    # 
                    frame_image_name = str(frame_index)+".png"
                    if all_frame_data.get(frame_image_name, None) == None:
                        all_frame_data[frame_image_name] = {}
                    
                    label = all_frame_data[frame_image_name].get("handpicked_eyebrow_score", None)
                    if label != None:
                        # 
                        # get the data
                        # 
                        return_data = []
                        for each_prev_frame in previous_frames:
                            faces = faces_for(each_prev_frame)
                            faces = [ each for each in faces if each.height() > minimum_face_size ]
                            if len(faces) > 0:
                                face = faces[0]
                                # 
                                # extract the data
                                # 
                                return_data.append((face.eyebrow_raise_score(), face.mouth_openness()))
                        
                        yield (return_data, label)


video_data = [ each for each in yield_video_data() ]
large_pickle_save(video_data, "./video_data_cache.nosync")

# 
# Setup Evaluation
# 

# this is all of the parameters that can be adjusted
def evalutate(threshhold=50, lookback_frames=10):
    # create True/False classification based on the threshhold
    
    labels = [ each > threshhold for each in labels ]
    
    def train_and_test(train_data, train_labels, test_data, test_labels):
        model = SVC()
        model.fit(train_data, train_labels)
        return model.score(test_data, test_labels)
    