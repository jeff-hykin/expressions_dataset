import numpy as np
import scipy as sp
import cv2
import os
import glob
import pickle
import scipy
import time
from time import sleep

# relative imports
import toolbox.face_tools.recognition.GenFeature as genfeat
import toolbox.face_tools.recognition.MTCNN as mtcnn
from toolbox.tools import paths, FS

feature_file = np.load(paths["feature_file.npz"])
UNKNOWN_LABEL = "Unknown"
THRESHOLD = 0.5
RUN_EXAMPLE = True
X11_AVALIBLE = True


label_array = []
feature_array = []
for key in feature_file:
    label_array.append(key)
    feature_array.append(feature_file[key])

def draw_label(image, point, label, emotion, font=cv2.FONT_HERSHEY_SIMPLEX, font_scale=1, thickness=2):
    size = cv2.getTextSize(label, font, font_scale, thickness)[0]
    x, y = point
    cv2.rectangle(image, (x, y - size[1]), (x + size[0], y), (255, 0, 0), -1)
    cv2.putText(image, label, point, font, font_scale, (255, 255, 255), thickness)
    cv2.putText(image, emotion, (point[0], point[1] + 20), font, font_scale, (255, 255, 255), thickness)

def get_label(feature):
    distance = float("inf")
    label = None
    print('np.array(feature_array).shape = ', len(np.array(feature_array)))
    if len(np.array(feature_array)) == 0:
        print("get_label received an empty feature array\n(which probably indicates a bug)")
        return UNKNOWN_LABEL

    dist = scipy.spatial.distance.cdist(feature.reshape((1, feature.size)), np.array(feature_array), 'cosine')
    closest_index = np.argmin(dist)
    distance, label = dist[0][closest_index], label_array[closest_index] 

    return label if distance < THRESHOLD else UNKNOWN_LABEL 


def get_margins(face_margin, margin=1):
    (x, y, w, h) = face_margin[0], face_margin[1], face_margin[2] - face_margin[0], face_margin[3] - face_margin[1]
    margin = int(min(w, h) * margin / 100)
    x_a = int(x - margin)
    y_a = int(y - margin)
    x_b = int(x + w + margin)
    y_b = int(y + h + margin)
    return (x_a, y_a, x_b - x_a, y_b - y_a)


def face_recon(video_file):
    video_capture = cv2.VideoCapture(video_file)
    while video_capture.isOpened():

        # TODO: I'm not sure why this busywait is here or what it does
        if not video_capture.isOpened():
            sleep(5)
        
        # Capture frame-by-frame
        ret, frame = video_capture.read()
        if ret != True:
            break
        
        
        original_frame = frame.copy()
        _, boundingboxes, features, emotion = mtcnn.process_image(frame)
        print('emotion = ', emotion)
        
        print('boundingboxes = ', boundingboxes)
        
        # placeholder for cropped faces
        for shape_index in range(boundingboxes.shape[0]):
            (x, y, w, h) = get_margins(boundingboxes[shape_index, 0:4])
            
            print('(x, y, w, h) = ', (x, y, w, h))
            
            if shape_index < len(features):
                label = get_label(features[shape_index])
            else:
                label = UNKNOWN_LABEL
            
            cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 200, 0), 2)
            draw_label(frame, (x, y), label, emotion)
        
        if not X11_AVALIBLE:
            print(f"label is: {label}")
        else:
            cv2.imshow('Face Detection', frame)
            
            # wait until user presses ESC key press
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    
    # When everything is done, release the capture
    video_capture.release()
    # FIXME: uncomment this cv2.destroyAllWindows()
    return label, original_frame


#
# example?
#
if __name__ == "__main__" and RUN_EXAMPLE:
    label, image = face_recon(paths['test_video'])
    # If label is "Unknown" type the desired name in the variable "userName"
    if label == UNKNOWN_LABEL:
        userName = input("Enter the name of this person: ")
        # Save the image with desired name and generate features and store them
        cv2.imwrite(paths["GenFeature_input_folder"] +"/" + userName + ".jpg", image)
        genfeat.generate_features()
