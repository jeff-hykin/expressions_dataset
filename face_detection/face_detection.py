import sys
import os
from os.path import isabs, isfile, isdir, join, dirname, basename, exists, splitext, relpath
from os import remove, getcwd, makedirs, listdir, rename, rmdir, system
from shutil import move
import glob
import regex as re
import numpy as np
import numpy
import pickle
import random
import itertools
import time
import subprocess
from subprocess import call
import json

from pathlib import Path
import cv2 as cv
import cv2
image = cv.imread(sys.argv[1])

def ndarray_to_list(ndarray):
    if type(ndarray) != numpy.ndarray:
        return ndarray
    else:
        as_list = ndarray.tolist()
        new_list = []
        for each in as_list:
            new_list.append(ndarray_to_list(each))
        return new_list

face_cascade = cv.CascadeClassifier(join(dirname(__file__),'haarcascade_frontalface_default.xml'))
faces = face_cascade.detectMultiScale(
    image,
    scaleFactor=1.1,
    minNeighbors=1,
    minSize=(100, 100),
    flags=cv.CASCADE_SCALE_IMAGE
)
print(json.dumps(ndarray_to_list(faces)))
# if (len(faces)):
    # (x, y, w, h) = faces[0]
    # face = image[y:y + h, x:x + w]
    # cv.rectangle(image, (x, y), (x + w, y + h), (0, 255, 0), 2)
    # final_face = cv.resize(face, (300, 300), cv.INTER_CUBIC)
    # input_face = final_face.astype(np.float32)
    # input_face = input_face / 255.0
    # input_face = np.expand_dims(input_face, axis=0)
    