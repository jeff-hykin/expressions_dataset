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
        *folders, video_filename, extension = FS.path_pieces(each_video_path)
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
                        
                        if len(return_data) == frame_lookback:
                            yield (return_data, label)


def generate_features_for(video_filepath, which_frame, frame_lookback=9, minimum_face_size=200):
    # this is to make up for including the current frame
    frame_lookback += 1
    
    # safety check
    if which_frame - frame_lookback < 0:
        raise Exception(f"You asked for frame {which_frame} but you want {frame_lookback} frames of lookback. That requires negative frames (which don't exist)")

    for each_video_path in [video_filepath]:
        *folders, video_filename, extension = FS.path_pieces(each_video_path)
        each_video = Video(each_video_path)
        
        previous_frames = []
        # load the video and break it up into frames
        for frame_index, each_frame in enumerate(each_video.frames()):    
            # if on any of the desired frames
            if frame_index >= which_frame - frame_lookback:
                if each_frame is None:
                    raise Exception(f"Had an issue loading the {frame_index} frame")
                
                # get the faces for the frame
                faces = faces_for(each_frame)
                # filter out small faces
                faces = [ each for each in faces if each.height() > minimum_face_size ]
                # make sure a face exists
                if len(faces) == 0:
                    raise Exception(f"Can't find a face in the {frame_index} frame")
                # pick the first face
                face = faces[0]
                # extract the features
                features = (face.eyebrow_raise_score(), face.mouth_openness())
                previous_frames.append(features)
            
            # if that was the last frame
            if frame_index == which_frame:
                return previous_frames
        
        raise Exception("It looks like the video doesn't have that many frames")

frame_lookback = 9
data_is_cached = True
cached_data_location = FS.join(here, "labeled_video_data_cache")
if not data_is_cached:
    video_data = [ each for each in yield_video_data() ]
    large_pickle_save(video_data, cached_data_location)
else:
    video_data = large_pickle_load(cached_data_location)

# make sure to clean up the data encase something went wrong and frames were dropped
number_of_features_per_frame = len(video_data[0][0][0])
max_frames = max([ len(each_data) for each_data, each_label in video_data ])
video_data = [ (each_data, each_label) for each_data, each_label in video_data if len(each_data) == max_frames ]


# 
# Setup Evaluation
# 

# this is all of the parameters that can be adjusted
def evalutate(threshhold=50, lookback_frames=10):
    # create True/False classification based on the threshhold
    
    # form the data and labels
    labels = [ each_label > threshhold for _, each_label in video_data ]
    data = [ framedata for framedata, _ in video_data]
    data = np.reshape(list(flatten(data)), (len(data), max_frames*number_of_features_per_frame))
    
    def train_and_test(train_data, train_labels, test_data, test_labels):
        model = SVC(gamma='scale',)
        model.fit(train_data, train_labels)
        return model.score(test_data, test_labels), model
    
    results = cross_validate(data, labels, train_and_test, number_of_folds=6)
    scores = [score for score, _ in results]
    scores.sort()
    return scores


scores = evalutate()
print('average score:', average(scores))
print(scores)


def feature_collector(number_of_lookbacks):
    previous_features = []
    def generator(feature):
        nonlocal previous_features
        if feature != None:
            previous_features.append(feature)
        if len(previous_features) > number_of_lookbacks+1:
            # remove the trailing/oldest feature
            previous_features = previous_features[1:]
        yield previous_features
    return generator
    

def return_trained_svm(svm_array):
    """
    svm_array = [
        [ svn(threshhold=100, lookback=10), svn(threshhold=100, lookback=9), svn(threshhold=100, lookback=8), svn(threshhold=100, lookback=7), svn(threshhold=100, lookback=6), svn(threshhold=100, lookback=5), svn(threshhold=100, lookback=4), svn(threshhold=100, lookback=3), ]
        [ svn(threshhold=90 , lookback=10), svn(threshhold=90 , lookback=9), svn(threshhold=90 , lookback=8), svn(threshhold=90 , lookback=7), svn(threshhold=90 , lookback=6), svn(threshhold=90 , lookback=5), svn(threshhold=90 , lookback=4), svn(threshhold=90 , lookback=3), ]
    ]
    """
    number_of_threshholds = len(svm_array)
    number_of_lookbacks = len(svm_array[0])
    def trained_svm(feature_generator):
        previous_features = []
        svn_input_generator = feature_collector(number_of_lookbacks)
        for each_feature in feature_generator:
            svn_input = svn_input_generator(each_feature)
            threshholds = {}
            for each_threshhold_group in svm_array:
                


def label_video(video_path, trained_svm):
    *folders, name, extension = FS.path_pieces(video_path)
    cache_path = {
        "facial_points"  : FS.join(*folders, name+".facial_points"),
        "features"       : FS.join(*folders, name+".features"),
        "label"          : FS.join(*folders, name+".labels"),
    }
    
    log(f"Begining video: {video_path}")
    LOG_INDENT += 1
    
    # 
    # Facial Points
    #
    if FS.is_file(cache_path["facial_points"]):
        log("Retreiving facial_points from cache")
        facial_points = large_pickle_load(cache_path["facial_points"])
    else:
        log("Loading video")
        video = Video(video_path)
        facial_points = []
        # load the video and break it up into frames
        LOG_INDENT += 1
        for frame_index, each_frame in enumerate(video.frames()):
            log(f"processing frame: {frame_index}")
            if each_frame == None:
                facial_points.append(None)
            else:
                faces = faces_for(each_frame)
                facial_points.append( [ each.as_array for each in faces])
        # save all the points
        log(f"saving all frames to cache")
        large_pickle_save(facial_points, cache_path["facial_points"])
        LOG_INDENT -= 1
    # 
    # generating eyebrow scores
    #
    if FS.is_file(cache_path["features"]):
        log("Retreiving features from cache")
        features = large_pickle_load(cache_path["features"])
    else:
        log("Computing features from facial points")
        features = []
        LOG_INDENT += 1
        for each_index, each_frame in enumerate(facial_points):
            log(f"getting features for frame: {each_index}")
            if each_frame == None or len(each_frame) == 0:
                features.append(None)
            else:
                for each_face in each_frame:
                    face = Face(as_array=each_face)
                    eyebrow_score = face.eyebrow_raise_score()
                    mouth_openness = face.mouth_openness()
                    features.append((eyebrow_score, mouth_openness))
                    break
                
        LOG_INDENT -= 1
        log("saving all features to cache")
        features = large_pickle_load(cache_path["features"])
    
    # 
    # generate the label for the video
    # 
    labels = []
    for each_label in trained_svm(features):
        yield each_label