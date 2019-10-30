from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__),'..', 'face_detection', 'tools.py')).read_text())
from sklearn.svm import SVC
here = dirname(__file__)

# 
# 
# Preprocessing
# 
# 
if True:
    INVALIDATE_CACHES = False
    def get_cache_path(video_path, feature_name):
        *folders, name, extension = FS.path_pieces(video_path)
        return FS.join(*folders, name+"."+feature_name+".pickle")
    
    def pre_existing_data_for(filepath):
        if FS.is_file(filepath) and not INVALIDATE_CACHES:
            log(f"Retreiving {filepath} from cache")
            return large_pickle_load(filepath)
        else:
            return None

    # 
    # facial_points from video
    # 
    def facial_points_from_video(video_path):
        cache_path = get_cache_path(video_path, "facial_points")
        facial_points = pre_existing_data_for(cache_path)
        if facial_points == None:
            log(f"Loading video {FS.basename(video_path)}")
            video = Video(video_path)
            facial_points = []
            # load the video and break it up into frames
            increment_log_indent()
            for frame_index, each_frame in enumerate(video.frames()):
                log(f"processing frame: {frame_index}")
                if each_frame is None:
                    facial_points.append(None)
                else:
                    faces = faces_for(each_frame)
                    facial_points.append( [ each.as_array for each in faces])
            # save all the points
            log(f"saving all frames to cache")
            large_pickle_save(facial_points, cache_path)
            decrement_log_indent()
        return facial_points

    # 
    # Feature Extraction from facial points
    # 
    def features_per_frame_from_video(video_filepath):
        facial_points = facial_points_from_video(video_filepath)
        # 
        # generating eyebrow scores
        #
        cache_path = get_cache_path(video_filepath, "features")
        features = pre_existing_data_for(cache_path)
        if features == None:
            log("Computing features from facial points")
            features = []
            increment_log_indent()
            for each_index, each_frame in enumerate(facial_points):
                log(f"getting features for frame: {each_index}")
                if each_frame is None or len(each_frame) == 0:
                    features.append(None)
                else:
                    for each_face in each_frame:
                        # TODO: add a filter here that only does faces above a certain height
                        face = Face(as_array=each_face)
                        eyebrow_score = face.eyebrow_raise_score()
                        mouth_openness = face.mouth_openness()
                        features.append((eyebrow_score, mouth_openness))
                        break
                    
            decrement_log_indent()
            log("saving all features to cache")
            large_pickle_save(features, cache_path)
        
        return features

    # a generator for getting a trailing number of "memory" frames 
    def feature_collector(num_of_lookback_frames):
        previous_features = []
        def aggregator(feature):
            nonlocal previous_features
            if feature != None:
                previous_features.append(feature)
            if len(previous_features) > num_of_lookback_frames+1:
                # remove the trailing/oldest feature
                previous_features = previous_features[1:]
            return list(previous_features)
        return aggregator
    
    def aggregated_frame_data(video_path, num_of_lookback_frames):
        input_generator = feature_collector(num_of_lookback_frames)
        for each_frame in features_per_frame_from_video(video_path):
            yield input_generator(each_frame)

# 
# 
# Training
# 
# 
if True:
    
    def labels_for(video_path):
        """
        returns a dictionary where
            keys = frame indexes 
            values = label for that frame
            
            if the video hasn't been labelled at all, it returns an empty dict
        """
        labels = {}
        *folders, name, extension = FS.path_pieces(video_path)
        json_data = FS.read(FS.join(*folders, "info.json"))
        if json_data == None:
            return labels
        else:
            video_data = json.loads(json_data)
            for each_key in video_data.keys():
                frame_data = video_data[each_key]
                # each key is a path to the frame as an image
                *folders, file_name, extension = FS.path_pieces(each_key)
                label = frame_data.get("handpicked_eyebrow_score", None)
                if label != None:
                    labels[int(file_name)] = label
        
        return labels
    
    def training_data_generator(training_data_source, num_of_lookback_frames):
        """
        summary:
            recursively searches a folder for any .mp4 files
            if they exist and are labelled, this function then gets the feature data 
            and labels and returns them as a list
            
        usage:
            inputs:
                training_data_source:
                    a path to a folder
                    the folder should contain (at any depth) .mp4 files
                
                num_of_lookback_frames:
                    should be an integer in the range (0 to any-real-integer)
                
            outputs:
                a generator which yeilds a tuple
                    there is 1 tuple for each frame in each video
                    each tuple contains (aggregated_frame_data, label_for)
        """
        from pathlib import Path
        all_video_locations = Path(training_data_source).rglob('*.mp4')
        for each_video_path in all_video_locations:
            each_video_path = str(each_video_path)
            increment_log_indent()
            log(f"getting training data from: {each_video_path}")
            labels = labels_for(each_video_path)
            # load up the points
            if len(labels.keys()) > 0:
                input_generator = aggregated_frame_data(each_video_path, num_of_lookback_frames)
                for frame_index, frame_data in enumerate(input_generator):
                    # once there is a label
                    label = labels.get(frame_index, None)
                    if label != None:
                        # save it as a sample
                        decrement_log_indent()
                        yield (frame_data, label)
                        increment_log_indent()
            decrement_log_indent()
            
    def refine_data_and_labels_with(training_data, threshhold, num_of_lookback_frames):
        """
        summary:
            this function strictly transforms and filters the training data based on 
            the threshhold and number of lookback_frames.
            
            frames with no data are removed and treated as if the frame never existed
        
        usage:
            inputs:
                training_data:
                    should be aggregated frame data
                    for example:
                        [
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
                threshhold:
                    should be a number in the range:  (1 to 100)
                
                num_of_lookback_frames:
                    should be an integer in the range (0 to any-real-integer)
        """
        if len(training_data) == 0:
            raise Exception("refine_data_and_labels_with() was called, but it was called with no training data.\nThis is probably an issue with a generator being consumed and can be fixed by converting the generator into a list\n, or by refreshing/recomuputing the generator")
        # filter by the number of lookbacks
        usable_datapoints = []
        for features, label in training_data:
            features = list(features)
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
        try:
            data = np.reshape(list(flatten(data)), (len(data), len(data[0])*len(data[0][0])))
        except:
            print('usable_datapoints = ', usable_datapoints)
            print('len(training_data) = ', len(training_data))
        
        return data, labels
    
    def train_cascaded_svm(training_data, threshhold, num_of_lookback_frames):
        """
        summary:
            a normal SVM would require a fixed/constant number of frame for every input
            
            this function changes that by allowing for a variable number of frames for every input
            this is done by training a fixed/constant SVM at all possible number of lookbacks less than the maximum
            
            when there is an input into the model,
            the model dynamically picks which fixed-SVM can be used and uses it
            
        usage:
            outputs:
                a function with
                    inputs:
                        aggregated frame data (for 1 frame)
                    outputs:
                        a boolean prediction
        """
        levels = []
        # generate several SVM's: one for every different amount of lookback
        training_data = list(training_data)
        # log(f'\n#\n# at num_of_lookback_frames: {num_of_lookback_frames}\n#')
        increment_log_indent()
        for each_num_of_lookback_frames in range(num_of_lookback_frames):
            train_data, train_labels = refine_data_and_labels_with(training_data, threshhold, each_num_of_lookback_frames)
            model = SVC(gamma='scale')
            model.fit(train_data, train_labels)
            levels.append(model)
        decrement_log_indent()
        
        # TODO: handle the case of 0 useable frames
        def svm_at_threshhold(features):
            max_num_of_frames = len(levels)
            features = [ feature for feature in features if feature != None ]
            if max_num_of_frames >= len(features):
                which_level = len(features)-1
            else:
                which_level = max_num_of_frames-1
                features = features[-max_num_of_frames:]
            
            flat_features = list(flatten(features))
            return levels[which_level].predict([flat_features])[0]
        
        return svm_at_threshhold

    def train_classifier(training_data, num_of_lookback_frames):
        """
        summary:
            this trains a matrix of SVMs
            it uses cascaded_svms (which are a vector of SVMs created to handle variable-number-of-frames)
            this function trains a vector of cascaded SVMs at different threshhold levels 
            and combines/averages their output
            
            this allows the model to return a floating point prediction instead of a boolean categorization.
        
        usage:
            inputs:
                training_data:
                    the training_data should be a list of aggregated frame data
                    (see the def refine_data_and_labels_with() for what that looks like)
                
                num_of_lookback_frames:
                    should be an integer in the range (0 to any-real-integer)
            outputs:
                a classifier function
                    inputs:
                        a list of frames with each element being features for that frame
                        ex: [ (10,0), (10,0) ] if there was only 2 frames
                        ex: [ (10,0) ] if there was only one frame
                    
                    outputs:
                        returns a floating point value based on 
                        the number of SVMs that were activated at the various threshhold levels
        
        """
        cascaded_svms = []
        training_data = list(training_data)
        # train SVMs at various different threshholds
        for each_threshold in [70]:
            cascaded_svms.append(train_cascaded_svm(training_data, each_threshold, num_of_lookback_frames))
        
        def classifier(data):
            # average together many threshholds to get a rough floating point probability
            number_of_triggers = sum([1 for each in cascaded_svms if each(data)])
            return number_of_triggers/len(cascaded_svms)
        
        return classifier
    
    def fully_trained_classifier(training_data_source, num_of_lookback_frames):
        data_and_labels = training_data_generator(training_data_source, num_of_lookback_frames)
        classifier = train_classifier(data_and_labels, num_of_lookback_frames)
        return classifier
        
    def fully_trained_sequential_classifier_generator(training_data_source, num_of_lookback_frames):
        """
        summary:
            this trains a classifier using all of the labelled video data
            that is avalible in the training_data_source
        usage:
            example:
                # train the SVMs
                classifer_generator = fully_trained_sequential_classifier_generator(training_data_source, num_of_lookback_frames)
                for each_video_path in videos:
                    frame_predictions  = classifer_generator(each_video_path)
                    for each in frame_predictions:
                        print(each) # a numeric probability
        """
        classifier = fully_trained_classifier(training_data_source, num_of_lookback_frames)
        # a generator that should be called once per video-clip
        def sequential_classifier_generator(video_filepath):
            frames = features_per_frame_from_video(video_filepath)
            collector = feature_collector(num_of_lookback_frames)
            for features_for_one_frame in frames:
                freatures_for_last_several_frames = collector(features_for_one_frame)
                yield classifier(freatures_for_last_several_frames)
        
        return sequential_classifier_generator
        
           
# 
# 
# Validation
#
# 
if True:
    def validate(training_data_source, num_of_lookback_frames, validation_threshhold=50):
        """
        summary:
            uses the training_data_generator() function to get data
            trains a SVM-based classifier on that data
            then evaluates the SVM-based classifier using 6 fold validation
        usage:
            inputs:
                training_data_source:
                    a path to the folder that contains .mp4 files with labled data
                    the labels should be in the info.json format
                num_of_lookback_frames:
                    should be an integer in the range (0 to any-real-integer)
                validation_threshhold:
                    should be a number in the range: (1 to 100)
                    this is the cutoff where above {validation_threshhold} is considered "True"
                    and below {validation_threshhold} is considered "False"
                    this is what is used as a baseline for measuring the accuracy of the classifier
        """
        # create a function for cross validation
        def train_and_test(train_data, train_labels, test_data, test_labels):
            classifier = train_classifier(train_data, num_of_lookback_frames)
            
            score = 0
            total = 0
            for aggregated_frames in test_data:
                total += 1
                prediction_boolean = (classifier(aggregated_frames)*100) > validation_threshhold
                label_boolean      = label > validation_threshhold
                if prediction_boolean == label_boolean:
                    score += 1
            actual_score = score / total
            
            return actual_score, classifier
        
        data_and_labels = training_data_generator(training_data_source, num_of_lookback_frames)
        null_labels = [None]*len(data_and_labels)
        results = cross_validate(data_and_labels, null_labels, train_and_test, number_of_folds=6)
        scores = [score for score, _ in results]
        scores.sort()
        return scores

# 
# 
# Application
# 
#
if True:
    def label_video(video_path, sequential_classifer):
        for each_frame in features_per_frame_from_video(video_path):
            yield sequential_classifer(each_frame)
    
    LABEL_CACHE_NAME = "generated_labels"
    def save_labels_for(video_path, sequential_classifer):
        cache_path = get_cache_path(video_path, LABEL_CACHE_NAME)
        labels = list(label_video(video_path))
        large_pickle_save(labels, cache_path)
    
    def retreive_labels_for(video_path):
        cache_path = get_cache_path(video_data, LABEL_CACHE_NAME)
        if not FS.is_file(cache_path):
            return None
        else:
            return large_pickle_load(cache_path)

# 
# 
# Demo
# 
# 
def demo(video_path, frame_labels):
    # TODO: demo
    # see http://zulko.github.io/moviepy/getting_started/videoclips.html#textclip
    
    import moviepy.editor as mpy
    # open up the video for editing
    video_file = mpy.VideoFileClip(video_path)
    fps = video_file.fps
    
    frame_time = -fps
    for each_frame_label in frame_labels:
        frame_time += fps
        text_label_clip =  mpy.TextClip(each_frame_label, font='Amiri-Bold').margin(top=15, opacity=0).set_position(("center","top"))
        text_label_clip.set_duration(fps)
        text_label_clip.set_start(frame_time)
        text_label_clip.set_ismask(True)
        video_file.add_mask(text_label_clip)
    
    *folders, name, extension = FS.path_pieces(video_path)
    new_path = FS.join(*folders, name + ".labelled.mp4")
    video_file.write_videofile(new_path)
    
# 
# 
# Main
# 
# 
if __name__ == "__main__":
    labelled_videos_path = FS.join(here, "./")
    # pick a location that has lots of videos
    training_data = training_data_generator(labelled_videos_path, num_of_lookback_frames=9)
    training_data = list(training_data)
    classifier = train_classifier(training_data, num_of_lookback_frames=4)
    prediction = classifier(training_data[0][0])
    
    classifier_generator = fully_trained_sequential_classifier_generator(training_data_source=labelled_videos_path, num_of_lookback_frames=9)
    def which_video(num):
        print(f'video: {num}')
        for frame_index, each_frame_prediction in enumerate(classifier_generator(FS.join(here, f"./vid_{num}/vid_{num}.mp4"))):
            print(f'{frame_index}:', each_frame_prediction)
    
    which_video(8)
    # num = 12
    # demo(FS.join(here, f"./vid_{num}/vid_{num}.mp4"), ["True"]*32)