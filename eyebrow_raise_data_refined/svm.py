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

# 
# 
# Preprocessing
# 
# 
if True:

    # 
    # facial_points from video
    # 
    def facial_points_from_video(video_path):
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
        return facial_points

    # 
    # Feature Extraction
    # 
    def features_per_frame_from_video(video_filepath):
        facial_points = facial_points_from_video(video_filepath)
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
        
        return features

    # getting a trailing number of "memory" frames 
    def feature_collector(num_of_lookback_frames):
        previous_features = []
        def generator(feature):
            nonlocal previous_features
            if feature != None:
                previous_features.append(feature)
            if len(previous_features) > num_of_lookback_frames+1:
                # remove the trailing/oldest feature
                previous_features = previous_features[1:]
            yield previous_features
        return generator

# 
# 
# Training
# 
# 
if True:
    # find any videos with labelled data
    # TODO: make this a parameter
    training_data_source = paths["raised_eyebrows_videos"]
    
    def labels_for(video_path):
        """
        returns a dictionary where
            keys = frame indexes 
            values = label for that frame
        """
        labels = {}
        *folders, name, extension = FS.path_pieces(video_path)
        json_data = FS.read(FS.join(*folders, "info.json"))
        if json_data == None:
            return labels
        else:
            data = json.load(json_data)
            for each_key in video_data.keys():
                frame_data = video_data[each_key]
                # each key is a path to the frame as an image
                *folders, file_name, extension = FS.path_pieces(each_key)
                label = frame_data.get("handpicked_eyebrow_score", None)
                if label != None:
                    labels[int(file_name)] = label
        
        return labels
    
    def all_training_data(training_data_source, num_of_lookback_frames):
        all_data = []
        all_video_locations = glob.glob(FS.join(training_data_source, "**/*.mp4"))
        for each_path in all_video_locations:
            labels = labels_for(each_path)
            # load up the points
            if len(labels.keys()) > 0:
                input_generator = feature_collector(num_of_lookback_frames)
                frame_features = features_per_frame_from_video(each_path)
                for frame_index, each in enumerate(frame_features):
                    model_input = input_generator(each)
                    # once there is a label
                    label = labels.get(frame_index, None)
                    if label != None:
                        # save it as a sample
                        all_data.append((model_input, label))
        return all_data
            

    def data_and_labels_with(training_data, threshhold, num_of_lookback_frames):
        """
        training_data = [
            
            # (data, label)
            ( 
                # features-per-frame
                [ 
                    (20, 10), # (eyebrow score,  mouth_openness)
                    (20, 10), # (eyebrow score,  mouth_openness)
                    (20, 10), # (eyebrow score,  mouth_openness)
                    # etc
                ],
                50 # the label
            ),
            
            # (data, label)
            ( 
                # features-per-frame
                [ 
                    (20, 10), # (eyebrow score,  mouth_openness)
                    (20, 10), # (eyebrow score,  mouth_openness)
                    (20, 10), # (eyebrow score,  mouth_openness)
                    # etc
                ],
                50 # the label
            ),
            
            # etc
        ]
        """
        # filter by the number of lookbacks
        usable_datapoints = []
        for features, label in training_data:
            # remove all the none features
            usable_frames = [ frame for frame in features if frame != None ]
            # remove any extra frames
            usable_frames = usable_frames[-(num_of_lookback_frames+1):]
            # if there were enough frames
            if len(usable_frames) == num_of_lookback_frames+1:
                # if the label exists
                if label != None:
                    # then its a valid datapoint
                    usable_datapoints.append((usable_frames, label))
        
        # form the data and labels
        labels = [ each_label > threshhold for _, each_label in usable_datapoints ]
        data   = [ features                for features, _   in usable_datapoints ]
        data   = np.reshape(list(flatten(data)), (len(data), num_of_lookback_frames*len(data[0][0])))
        
        return data, labels
    
    def train_cascaded_svm(training_data, threshhold, num_of_lookback_frames):
        levels = []
        # generate several SVM's: one for every different amount of lookback
        for each_num_of_lookback_frames in range(1,num_of_lookback_frames+1):
            train_data, train_labels = data_and_labels_with(training_data, threshhold, each_num_of_lookback_frames)
            model = SVC(gamma='scale')
            model.fit(train_data, train_labels)
            levels.append(model)
        
        def svm_at_threshhold(features):
            max_num_of_frames = len(levels)
            features = [ feature for feature in features if feature != None ]
            if max_num_of_frames >= len(features):
                return levels[len(features)-1].predict(features)
            else:
                features = features[-max_num_of_frames:]
                return levels[max_num_of_frames-1].predict(features)
        
        return svm_at_threshhold


    def train_classifier(training_data, num_of_lookback_frames):
        cascaded_svms = []
        # train SVMs at various different threshholds
        for each_threshold in range(10, 110, 10):
            cascaded_svms.append(train_cascaded_svm(training_data, each_threshold, num_of_lookback_frames))
        
        def classifier(data):
            # average together many threshholds to get a rough floating point probability
            number_of_triggers = sum([1 for each in cascaded_svms if each(data)])
            return number_of_triggers/len(cascaded_svms)
        
        return classifier
    
    
    def train_sequential_classifier(training_data, num_of_lookback_frames):
        classifier = train_classifier(training_data, num_of_lookback_frames)
        feature_collector = feature_collector(num_of_lookback_frames)
        def sequential_classifier(features_for_one_frame):
            freatures_for_last_several_frames = feature_collector(features_for_one_frame)
            return classifier(freatures_for_last_several_frames)
        

# 
# 
# Validation
#
# 
if True:
    def validate(data, labels):
        def train_and_test(train_data, train_labels, test_data, test_labels):
            model = SVC(gamma='scale',)
            model.fit(train_data, train_labels)
            return model.score(test_data, test_labels), model
        
        results = cross_validate(data, labels, train_and_test, number_of_folds=6)
        scores = [score for score, _ in results]
        scores.sort()
        return scores

# 
# 
# Application
# 
# 
def label_video(video_path, trained_svm):
    *folders, name, extension = FS.path_pieces(video_path)
    cache_path = {
        "facial_points"  : FS.join(*folders, name+".facial_points"),
        "features"       : FS.join(*folders, name+".features"),
        "label"          : FS.join(*folders, name+".labels"),
    }
    
    log(f"Begining video: {video_path}")
    LOG_INDENT += 1
    features = features_per_frame_from_video(video_path, facial_points)
    LOG_INDENT -= 1
    
    # 
    # generate the labels for the video
    # 
    labels = []
    for each_label in trained_svm(features):
        yield each_label