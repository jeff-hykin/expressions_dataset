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

def ndarray_to_list(ndarray):
    if type(ndarray) != numpy.ndarray:
        return ndarray
    else:
        as_list = ndarray.tolist()
        new_list = []
        for each in as_list:
            new_list.append(ndarray_to_list(each))
        return new_list

class Image(object):
    def __init__(self, arg1):
        """
        path: can be a string (the path to an image file) or an ndarray (a cv2 image)
        """
        self.face_boxes = None
        if type(arg1) == str:
            self.path = arg1
            self.img = cv.imread(arg1)
        elif type(arg1) == numpy.ndarray:
            self.path = None
            self.img = arg1
        else:
            raise Exception('Not sure how to create an image using ' + str(arg1))
    
    def find_faces(self):
        face_cascade = cv.CascadeClassifier(join(dirname(__file__),'haarcascade_frontalface_default.xml'))
        faces = face_cascade.detectMultiScale(
            self.img,
            scaleFactor=1.1,
            minNeighbors=1,
            minSize=(100, 100),
            flags=cv.CASCADE_SCALE_IMAGE
        )
        self.face_boxes = ndarray_to_list(faces)
        return self.face_boxes
    
    def show(self):
        print("Press ESC to exit the image")
        if self.path != None:
            name = self.path
        else:
            name = "img"
        cv2.imshow(name, self.img)
        while True:
            key = cv2.waitKey(1)
            if key == 27:  #ESC key to break
                break
        cv2.destroyWindow(name)

    def with_facial_bounding_boxes(self, color=(255, 255, 00)):
        """
        color: a tuple such as (255, 255, 00)
        returns:
            a copy of the image with the bounding boxes
        """
        img_copy = self.img.copy()
        if self.face_boxes == None:
            self.find_faces()
        for x, y, w, h in self.face_boxes:
            cv2.rectangle(img_copy, (x, y), (x+w, y+h), color, 2)
        return Image(img_copy)
    
    def save(to):
        cv2.imwrite(to, self.img)