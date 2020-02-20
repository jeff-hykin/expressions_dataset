from toolbox.tools import paths

import numpy as np
import scipy as sp
import cv2
import os
import glob
import pickle
#import utils.MTCNN as mtcnn
import toolbox.face_tools.recognition.MTCNN as mtcnn

data_dump = {}
input_data_dir = paths["GenFeature_input_folder"]


def generate_features():
    input_files = glob.glob(input_data_dir + "/*.jpg")
    #print (input_files)
    for line in input_files:
        frame = cv2.imread(line)
        _, _, features, _ = mtcnn.process_image(frame)

        if features:
            data_dump[line[len(input_data_dir):-4]] = features[0]
        else:
            print(line)
            continue
    np.savez(paths["feature_file.npz"], **data_dump)


if __name__ == "__main__":
    generate_features()
