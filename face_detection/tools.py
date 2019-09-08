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

import os
import glob
import shutil
class FileSys():
    @classmethod
    def write(self, data, to=None):
        # make sure the path exists
        FileSys.makedirs(os.path.dirname(to))
        with open(to, 'w') as the_file:
            the_file.write(str(data))
    
    @classmethod
    def read(self, filepath):
        try:
            with open(filepath,'r') as f:
                output = f.read()
        except:
            output = None
        return output    
        
    @classmethod
    def delete(self, filepath):
        if isdir(filepath):
            shutil.rmtree(filepath)
        else:
            try:
                os.remove(filepath)
            except:
                pass
    
    @classmethod
    def makedirs(self, path):
        try:
            os.makedirs(path)
        except:
            pass
        
    @classmethod
    def copy(self, from_=None, to=None, new_name="", force= True):
        if new_name == "":
            raise Exception('FileSys.copy() needs a new_name= argument:\n    FileSys.copy(from_="location", to="directory", new_name="")\nif you want the name to be the same as before do new_name=None')
        elif new_name == None:
            new_name = os.path.basename(from_)
        
        # get the full path
        to = os.path.join(to, new_name)
        # if theres a file in the target, delete it
        if force and FileSys.exists(to):
            FileSys.delete(to)
        # make sure the containing folder exists
        FileSys.makedirs(os.path.dirname(to))
        if os.path.isdir(from_):
            shutil.copytree(from_, to)
        else:
            return shutil.copy(from_, to)
    
    @classmethod
    def move(self, from_=None, to=None, new_name="", force= True):
        if new_name == "":
            raise Exception('FileSys.move() needs a new_name= argument:\n    FileSys.move(from_="location", to="directory", new_name="")\nif you want the name to be the same as before do new_name=None')
        elif new_name == None:
            new_name = os.path.basename(from_)
        
        # get the full path
        to = os.path.join(to, new_name)
        # make sure the containing folder exists
        FileSys.makedirs(os.path.dirname(to))
        shutil.move(from_, to)
    
    @classmethod
    def exists(self, *args):
        return FileSys.does_exist(*args)
    
    @classmethod
    def does_exist(self, path):
        return os.path.exists(path)
    
    @classmethod
    def is_folder(self, *args):
        return FileSys.is_directory(*args)
        
    @classmethod
    def is_dir(self, *args):
        return FileSys.is_directory(*args)
        
    @classmethod
    def is_directory(self, path):
        return os.path.isdir(path)
    
    @classmethod
    def is_file(self, path):
        return os.path.isfile(path)

    @classmethod
    def list_files(self, path="."):
        return [ x for x in FileSys.ls(path) if FileSys.is_file(x) ]
    
    @classmethod
    def list_folders(self, path="."):
        return [ x for x in FileSys.ls(path) if FileSys.is_folder(x) ]
    
    @classmethod
    def ls(self, filepath="."):
        glob_val = filepath
        if os.path.isdir(filepath):
            glob_val = os.path.join(filepath, "*")
        return glob.glob(glob_val)

    @classmethod
    def touch(self, path):
        FileSys.makedirs(FileSys.dirname(path))
        if not FileSys.exists(path):
            FileSys.write("", to=path)
    
    @classmethod
    def touch_dir(self, path):
        FileSys.makedirs(path)
    
    @classmethod
    def dirname(self, path):
        return os.path.dirname(path)
    
    @classmethod
    def basename(self, path):
        return os.path.basename(path)
    
    @classmethod
    def extname(self, path):
        filename, file_extension = os.path.splitext(path)
        return file_extension
    
    @classmethod
    def path_peices(self, path):
        """
        example:
            *folders, file_name, file_extension = FileSys.path_peices("/this/is/a/filepath.txt")
        """
        folders = []
        while 1:
            path, folder = os.path.split(path)

            if folder != "":
                folders.append(folder)
            else:
                if path != "":
                    folders.append(path)

                break
        folders.reverse()
        *folders, file = folders
        filename, file_extension = os.path.splitext(file)
        return [ *folders, filename, file_extension ]
    
    @classmethod
    def join(self, *paths):
        return os.path.join(*paths)
FS = FileSys

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
    
    def save(self, to):
        FS.makedirs(FS.dirname(to))
        cv2.imwrite(to, self.img)
        

