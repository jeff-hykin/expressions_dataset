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

def show_img(img):
    print("Press ESC to exit the image")
    cv2.imshow("", img)
    while True:
        key = cv2.waitKey(1)
        if key == 27:  #ESC key to break
            break
    cv2.destroyAllWindows()

def ndarray_to_list(ndarray):
    if type(ndarray) != numpy.ndarray:
        return ndarray
    else:
        as_list = ndarray.tolist()
        new_list = []
        for each in as_list:
            new_list.append(ndarray_to_list(each))
        return new_list

def faces_for(image):
    face_cascade = cv.CascadeClassifier(join(dirname(__file__),'haarcascade_frontalface_default.xml'))
    faces = face_cascade.detectMultiScale(
        image,
        scaleFactor=1.1,
        minNeighbors=1,
        minSize=(100, 100),
        flags=cv.CASCADE_SCALE_IMAGE
    )
    return ndarray_to_list(faces)

def add_boxes_to(img, boxes, color=(255, 255, 00)):
    """
    img: a cv2 image object
    boxes:
        an array of arrays/tuples with x,y,width,height
        example:
        [
            (10, 10, 100, 100)
        ]
    """
    # add bounding boxes
    for x, y, w, h in boxes:
        cv2.rectangle(img, (x, y), (x+w, y+h), color, 2)
    return img