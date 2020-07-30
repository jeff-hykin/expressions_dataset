import include
include.file("../../toolbox/tools.py", globals())
include.file("./data_saver.py", globals())

from toolbox.face_tools.expressions.Facial_expressions_detection import network_output as get_emotion_data
from toolbox.face_tools.expressions.Facial_expressions_detection import preprocess_face

face_cascade = cv.CascadeClassifier(paths['haarcascade_frontalface_default'])
def get_faces(image):
    face_dimensions = face_cascade.detectMultiScale(image, scaleFactor=1.1, minNeighbors=1, minSize=(100, 100), flags=cv.CASCADE_SCALE_IMAGE)
    cropped_faces = [ image[y:y + h, x:x + w] for x, y, w, h in face_dimensions ]
    return cropped_faces, face_dimensions


def pick_frame(self, frame_index, each_frame):
    """
    frame_index:
    .    starts off as None
    .    otherwise is an int of which frame was just provided
    each_frame:
    .   expects None if the index didn't exist in the video
    .   otherwise expects numpy array
    
    return:
    .   int, the index of the next frame it wants to evaluate
    .   return None if the video is completely processed
    """
    # start by asking for the first frame
    if type(frame_index) == type(None):
        return 0
    
    # once the final frame is found, simply stop
    if type(each_frame) == type(None):
        return None

    try:
        self.stats["total"]["frames_evaluated"] += 1
        
        # check for duplicate frames
        if np.array_equal(self.previous_frame, each_frame):
            self.DataSaver.save_frame(frame_index, self.face_data)
            # skip to the next frame
            return frame_index + 1
        else:
            self.previous_frame = each_frame
        
        # logger
        face_frame_count = self.stats["local"]["face_frame_count"]
        face_frames_str = Console.color(face_frame_count, foreground="yellow")
        rate_str = Console.color(self.rate, foreground="bright_red")
        try:
            success_rate = self.total_found_faces / (self.total_frames+0.000001)
        except:
            success_rate = 0
        self.ProgressLog.on_new_frame(
            frame_index,
            each_frame,
            show=f"face-frames:{face_frames_str} rate:{rate_str} success %:{success_rate}"
        )
        
        # 
        # find faces
        # 
        start = time.time()
        # actual machine learning usage
        face_images, dimensions = get_faces(each_frame)
        self.faces_exist = len(face_images) != 0
        self.face_data = []
        self.stats["local"]["find_faces_duration"]     += time.time() - start
        self.stats["local"]["face_frame_count"]        += 1 if self.faces_exist else 0
        
        # 
        # record face_sequences
        # 
        # each sequence is a length-2 list, first element == start index, second element = end index
        # there is a (None, None) tuple that will often be trailing the end of self.stats["local"]["face_sequences"]
        most_recent_sequence = self.stats["local"]["face_sequences"][-1]
        sequence_was_started = most_recent_sequence[0] is not None
        if not self.faces_exist:
            # close off the old sequence by adding a new one
            if sequence_was_started:
                self.stats["local"]["face_sequences"].append([None, None])
            else:
                # do nothing if a sequence hadn't even been started
                pass
        # if faces exist
        else:
            if sequence_was_started:
                # then just add onto the end of the sequence
                most_recent_sequence[1] = frame_index
            else:
                # start a sequence by setting the start/end value
                most_recent_sequence[0] = frame_index
                most_recent_sequence[1] = frame_index
        
        #
        # find emotion
        #
        start = time.time()
        for each_face_img, each_dimension in zip(face_images, dimensions):
            self.face_data.append({
                "x" : int(each_dimension[0]),
                "y" : int(each_dimension[1]),
                "width" : int(each_dimension[2]),
                "height" : int(each_dimension[3]),
                self.EMOTION_FINDER_KEY : get_emotion_data(preprocess_face(each_face_img)),
            })
            # round all the emotions up to ints
            probabilities = self.face_data[-1][self.EMOTION_FINDER_KEY]["probabilities"]
            for each_key in probabilities:
                probabilities[each_key] = int(round(probabilities[each_key], 0))
        self.stats["local"]["find_emotion_duration"] += time.time() - start
        
        self.DataSaver.save_frame(frame_index, self.face_data) 

    except KeyboardInterrupt:
        print(f'\nGot the message, stopping on video completion\nNOTE: interrupt {self.FORCE_CANCEL_LIMIT - self.stop_on_next_video} more times to cause a force cancel')
        self.stop_on_next_video += 1
        # if the user says to end repeatedly
        if self.stop_on_next_video > self.FORCE_CANCEL_LIMIT:
            # stop immediately, causing partially bad data
            exit(0)
    
    return self.pick_next_frame(frame_index)
