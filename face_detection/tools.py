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
from ruamel.yaml import YAML
yaml = YAML()

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
    
    @classmethod
    def absolute_path(self, path):
        return os.path.abspath(path)
    
FS = FileSys

class Image(object):
    def __init__(self, arg1):
        """
        @arg1: can either be a string (the path to an image file) or an ndarray (a cv2 image)
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
        print("Press ESC (on the image window) to exit the image")
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

    def bounding_boxes(self, color=(255, 255, 00)):
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
    
    def with_points(self, array_of_points, color=(255, 255, 00), radius=3):
        img_copy = self.img.copy()
        for x, y, in array_of_points:
            cv.circle(img_copy, (x, y), radius, color, thickness=-1, lineType=8, shift=0)
        return Image(img_copy)
    
    def save(self, to, image_type="png"):
        FS.makedirs(FS.dirname(to))
        result = cv2.imwrite(FS.absolute_path(to+"."+image_type), self.img)
        if not result:
            raise Exception("Could not save image:"+str(to))

class Video(object):
    def __init__(self, path):
        self.path = path
    
    def frames(self):
        """
        returns: a generator, where each element is a image as a numpyarray 
        """
        # Path to video file 
        vidObj = cv2.VideoCapture(self.path)
        # checks whether frames were extracted 
        success = 1
        while True: 
            # vidObj object calls read 
            # function extract frames 
            success, image = vidObj.read()
            yield image
            if not success:
                return None

# load the info.yaml and some of its data
Info = yaml.load(FS.read(join(dirname(__file__),'..','info.yaml')))
paths = Info["(project)"]["(advanced_setup)"]["(paths)"]



import sys
import os
from os.path import isabs, isfile, isdir, join, dirname, basename, exists, splitext
from os import remove, getcwd, makedirs, listdir, rename, rmdir
from shutil import move
import dlib
import glob
import numpy as np

detector  = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor(paths["shape_predictor_68_face_landmarks"])

nuber_of_face_features = 68

import math
def average(items):
    running_total = 0
    for each in items:
        running_total += each
    return running_total / len(items)

class Geometry():
    @classmethod
    def bounds_to_points(self, max_x, max_y, min_x, min_y):
        return (min_x, min_y), (max_x, min_y), (max_x, max_y), (min_x, min_y)
    
    @classmethod
    def bounding_box(self, array_of_points):
        """
        the input needs to be an array with the first column being x values, and the second column being y values
        """
        max_x = -float('Inf')
        max_y = -float('Inf')
        min_x = float('Inf')
        min_y = float('Inf')
        for each in array_of_points:
            if max_x < each[0]:
                max_x = each[0]
            if max_y < each[1]:
                max_y = each[1]
            if min_x > each[0]:
                min_x = each[0]
            if min_y > each[1]:
                min_y = each[1]
        return max_x, max_y, min_x, min_y
    
    @classmethod
    def poly_area(self, points):
        """
        @points: a list of points (x,y tuples) that form a polygon
        
        returns: the aread of the polygon
        """
        xs = []
        ys = []
        for each in points:
            x,y = each
            xs.append(x)
            ys.append(y)
        return 0.5*np.abs(np.dot(xs,np.roll(ys,1))-np.dot(ys,np.roll(xs,1)))


    @classmethod
    def distance_between(self, point1, point2):
        x1,y1 = point1
        x2,y2 = point2
        dist = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)  
        return dist  

    @classmethod
    def rotate(self, point, angle, about):
        """
        @about a tuple (x,y) as a point, this is the point that will be used as the axis of rotation
        @point a tuple (x,y) as a point that will get rotated counter-clockwise about the origin
        @angle an angle in radians, the amount of counter-clockwise roation

        The angle should be given in radians.
        """
        ox, oy = about
        px, py = point

        qx = ox + math.cos(angle) * (px - ox) - math.sin(angle) * (py - oy)
        qy = oy + math.sin(angle) * (px - ox) + math.cos(angle) * (py - oy)
        return qx, qy
    
    @classmethod
    def counter_clockwise_angle(self, from_, to):
        x1, y1 = from_
        x2, y2 = to
        answer = math.atan2(x1*y2-y1*x2,x1*x2+y1*y2)
        # if negative, change to positive and add 180 degrees
        if answer < 0:
            answer = answer * -1 + math.pi
        return answer
    
    @classmethod
    def vector_pointing(self, from_, to):
        return tuple(map(int.__sub__, to, point))

class Face():
    def __init__(self, shape, img):
        global nuber_of_face_features
        self.img = img
        # create the empty array
        self.as_array = np.empty((nuber_of_face_features, 2), dtype=np.int32)
        self.relative_face = None
        # store the face as an array
        for each_part_index in range(shape.num_parts):
            point = shape.part(each_part_index)
            self.as_array[each_part_index][0] = point.x
            self.as_array[each_part_index][1] = point.y
        # calculate the bounding boxes
        self.chin_curve_bounds    = Geometry.bounding_box(self.chin_curve())
        self.left_eyebrow_bounds  = Geometry.bounding_box(self.left_eyebrow())
        self.right_eyebrow_bounds = Geometry.bounding_box(self.right_eyebrow())
        self.nose_bounds          = Geometry.bounding_box(self.nose())
        self.left_eye_bounds      = Geometry.bounding_box(self.left_eye())
        self.right_eye_bounds     = Geometry.bounding_box(self.right_eye())
        self.mouth_bounds         = Geometry.bounding_box(self.mouth())
        # calculate the face bounding box
        max_x = max(self.chin_curve_bounds[0], self.left_eyebrow_bounds[0], self.right_eyebrow_bounds[0], self.nose_bounds[0], self.left_eye_bounds[0], self.right_eye_bounds[0], self.mouth_bounds[0])
        max_y = max(self.chin_curve_bounds[1], self.left_eyebrow_bounds[1], self.right_eyebrow_bounds[1], self.nose_bounds[1], self.left_eye_bounds[1], self.right_eye_bounds[1], self.mouth_bounds[1])
        min_x = min(self.chin_curve_bounds[2], self.left_eyebrow_bounds[2], self.right_eyebrow_bounds[2], self.nose_bounds[2], self.left_eye_bounds[2], self.right_eye_bounds[2], self.mouth_bounds[2])
        min_y = min(self.chin_curve_bounds[3], self.left_eyebrow_bounds[3], self.right_eyebrow_bounds[3], self.nose_bounds[3], self.left_eye_bounds[3], self.right_eye_bounds[3], self.mouth_bounds[3])
        self.bounds = ( max_x, max_y, min_x, min_y )
    
    def bounded_by(self, bounds, padding):
        height = self.img.shape[0]
        x_max = bounds[0] + int(padding * height)
        y_max = bounds[1] + int(padding * height)
        x_min = bounds[2] - int(padding * height)
        y_min = bounds[3] - int(padding * height)
        # dont let the indices go negative
        if x_min < 0:
            x_min = 0
        if y_min < 0:
            y_min = 0
        return self.img[ y_min:y_max, x_min:x_max]
    
    #
    # Facial parts
    #
    # see: https://miro.medium.com/max/828/1*96UT-D8uSXjlnyvs9DZTog.png
    def chin_curve(self):
        return self.as_array[0:16]
    def left_eyebrow(self):
        return self.as_array[17:21]
    def right_eyebrow(self):
        return self.as_array[22:26]
    def nose(self):
        return self.as_array[27:35]
    def left_eye(self):
        return self.as_array[36:41]
    def right_eye(self):
        return self.as_array[42:47]
    def mouth(self):
        return self.as_array[48:67]

    #
    # bounding boxes
    #
    def bounding_box(self):
        return Geometry.bounds_to_points(*self.bounds)
    def chin_curve_bounding_box(self):
        return Geometry.bounds_to_points(*self.chin_curve_bounds)
    def left_eyebrow_bounding_box(self):
        return Geometry.bounds_to_points(*self.left_eyebrow_bounds)
    def right_eyebrow_bounding_box(self):
        return Geometry.bounds_to_points(*self.right_eyebrow_bounds)
    def nose_bounding_box(self):
        return Geometry.bounds_to_points(*self.nose_bounds)
    def left_eye_bounding_box(self):
        return Geometry.bounds_to_points(*self.left_eye_bounds)
    def right_eye_bounding_box(self):
        return Geometry.bounds_to_points(*self.right_eye_bounds)
    def mouth_bounding_box(self):
        return Geometry.bounds_to_points(*self.mouth_bounds)
    
    #
    # Save options
    #
    def save_to(self, image_path, padding):
        """padding is a percentage of the height"""
        dlib.save_image(self.bounded_by(self.bounds, padding), image_path)
    def save_chin_curve_to(self, image_path, padding):
        """padding is a percentage of the height"""
        dlib.save_image(self.bounded_by(self.chin_curve_bounds, padding), image_path)
    def save_left_eyebrow_to(self, image_path, padding):
        """padding is a percentage of the height"""
        dlib.save_image(self.bounded_by(self.left_eyebrow_bounds, padding), image_path)
    def save_right_eyebrow_to(self, image_path, padding):
        """padding is a percentage of the height"""
        dlib.save_image(self.bounded_by(self.right_eyebrow_bounds, padding), image_path)
    def save_nose_to(self, image_path, padding):
        """padding is a percentage of the height"""
        dlib.save_image(self.bounded_by(self.nose_bounds, padding), image_path)
    def save_left_eye_to(self, image_path, padding):
        """padding is a percentage of the height"""
        dlib.save_image(self.bounded_by(self.left_eye_bounds, padding), image_path)
    def save_right_eye_to(self, image_path, padding):
        """padding is a percentage of the height"""
        dlib.save_image(self.bounded_by(self.right_eye_bounds, padding), image_path)
    def save_mouth_to(self, image_path, padding):
        """padding is a percentage of the height"""
        dlib.save_image(self.bounded_by(self.mouth_bounds, padding), image_path)
    
    # 
    # misc helpers
    #
    def bottom_of_chin():
        # these magic indexes are from: https://miro.medium.com/max/828/1*96UT-D8uSXjlnyvs9DZTog.png
        return self.as_array[0]
    
    def top_of_nose(self):
        # these magic indexes are from: https://miro.medium.com/max/828/1*96UT-D8uSXjlnyvs9DZTog.png
        return self.as_array[16]
    
    def face_relative_points(self):
        # TODO: this could be done more efficiently with a single matrix multiplication (2D rotate, translate, scale)
        
        # performs a roation on each point to make the face vertical
        # translates the face so that the center of the chin is (0,0)
        # scales the points relative to the width/height of the face 
        
        global nuber_of_face_features
        if self.relative_face != None:
            return self.relative_face
        
        faces_vector = Geometry.vector_pointing(from_=self.bottom_of_chin(), to=self.top_of_nose())
        base_vector  = (0,1)
        # note: this angle will probably be more than 180 degrees
        # this is because its putting the face on a mathematical plane (y increases as it goes up)
        # and the image plane y gets larger going down
        needed_rotation = Geometry.counter_clockwise_angle(from_=face_vector, to=base_vector)
        
        # create the empty array for the new face points
        self.relative_face = np.empty((nuber_of_face_features, 2), dtype=np.int32)
        # rotate the chin-point first to get the new origin
        new_bottom_of_chin_x, new_bottom_of_chin_y  = Geometry.rotate(point=self.bottom_of_chin(), angle=needed_rotation, about=(0,0))
        # get width and height for scaling
        width, height = (self.width(), self.height())
        for each_index, each_point in enumerate(self.as_array):
            each_x, each_y = each_point
            # perform the rotation
            new_point_x, new_point_y = Geometry.rotate(point=each_point, angle=needed_rotation, about=(0,0))
            # perform the translation (to make the chin the new origin)
            new_point_x, new_point_y = ( new_point_x - new_bottom_of_chin_x, new_point_y - new_bottom_of_chin_y )
            # perform the scaling
            new_scaled_point = ( new_point_x / width, new_point_y / height )
            
            self.relative_face = new_scaled_point
        
        return self.relative_face
        
    # this is the width from one side of the face to the other side
    def width(self):
        # these magic indexes are from: https://miro.medium.com/max/828/1*96UT-D8uSXjlnyvs9DZTog.png
        return Geometry.distance_between(self.as_array[0], self.as_array[16])
    
    # this is the height from the top of the nose to the bottom of the chin
    def height(self):
        # these magic indexes are from: https://miro.medium.com/max/828/1*96UT-D8uSXjlnyvs9DZTog.png
        return Geometry.distance_between(self.as_array[8], self.as_array[27])
        
    def mouth_openness(self):
        """
        
        """
        # for reference see: https://miro.medium.com/max/828/1*96UT-D8uSXjlnyvs9DZTog.png
        distance_1 = Geometry.distance_between(self.as_array[61], self.as_array[67])
        distance_2 = Geometry.distance_between(self.as_array[62], self.as_array[66])
        distance_3 = Geometry.distance_between(self.as_array[63], self.as_array[65])
        return average([distance_1, distance_2, distance_3])
    
    def eye_width(self):
        # for reference see: https://miro.medium.com/max/828/1*96UT-D8uSXjlnyvs9DZTog.png
        right_eye_width  = Geometry.distance_between(self.right_eye()[0], self.right_eye()[-3])
        left_eye_width   = Geometry.distance_between(self.left_eye()[0] , self.left_eye()[-3])
        return average([right_eye_width, left_eye_width])
    
    def left_eye_center(self):
        eye_points = self.left_eye()
        average_x = average([ point[0] for point in eye_points ])
        average_y = average([ point[1] for point in eye_points ])
        return ( average_x, average_y )

    def right_eye_center(self):
        eye_points = self.right_eye()
        average_x = average([ point[0] for point in eye_points ])
        average_y = average([ point[1] for point in eye_points ])
        return ( average_x, average_y )
        
    def eyebrow_raise_score(self, left_right_or_both="both"):
        """
        left_right_or_both: a string that is either "left", "right", or "both" depending on the desired eyebrow height
        
        returns a float representing how high the eyebrows are raised
        """
        if left_right_or_both == "both":
            # recursively get each side
            standardized_height_of_left  = self.eyebrow_raise_score(left_right_or_both="left")
            standardized_height_of_right = self.eyebrow_raise_score(left_right_or_both="right")
            
            # penalize for being different
            # explaination:
            #     if they're only a little different (relative to their overall height)
            #     then most of that difference will be added (close to a max(height_left, height_right) )
            #     if they're very different relative to their overall height above the eye
            #     then most of that difference will not be added (close to a min(height_left, height_right) )
            difference = abs(standardized_height_of_left - standardized_height_of_right)
            similarity = min(standardized_height_of_left, standardized_height_of_right)
            percent_similar = difference / similarity
            moderated_value = similarity + (difference * percent_similar)
            return moderated_value
            
        if left_or_right == "left":
            eye_points = self.left_eye()
            eyebrow_points = self.left_eyebrow()
            center_of_eye = self.left_eye_center()
        else:
            eye_points = self.right_eye()
            eyebrow_points = self.right_eyebrow()
            center_of_eye = self.right_eye_center()
        
        eyebrow_height = average([ Geometry.distance_between(center_of_eye, each_eyebrow_point) for each_eyebrow_point in eyebrow_points ])
        standardized_eyebrow_height = eyebrow_height / self.eye_width()
        
        return standardized_eyebrow_height
        
        # # Alternative method
        # get the eye points as if the eye was closed (crush down to only 4 points)
        # for reference see: https://miro.medium.com/max/828/1*96UT-D8uSXjlnyvs9DZTog.png
        # eye_points = (
        #     eye_points[0],
        #     (eye_points[1] + eye_points[-1])/2,
        #     (eye_points[2] + eye_points[-2])/2,
        #     eye_points[-3]
        # )
        # # use this to create a genertic value
        # eye_width  = Geometry.distance_between(eye_points[0], eye_points[-1])
        
        # TODO: get the nose vector instead of using distance
        # np.dot(x, y) / np.linalg.norm(y)
        
        # sum the distance
        # running_height = 0
        # for each_eye_point in eye_points:
        #     # get the average distance of the eyebrow points
        #     avg_distance = average([ Geometry.distance_between(each_eye_point, each_eyebrow_point) for each_eyebrow_point in eyebrow_points ])
        #     running_height += avg_distance
        # # divide to get the average
        # eyebrow_height = running_height / len(sides_of_eye)


def faces_for(img):
    global detector
    global predictor

    # Ask the detector to find the bounding boxes of each face. The 1 in the
    # second argument indicates that we should upsample the image 1 time. This
    # will make everything bigger and allow us to detect more faces.
    dets = detector(img, 1)
    # initialize by the number of faces
    faces = [None]*len(dets)
    for index, d in enumerate(dets):
        faces[index] = Face(predictor(img, d), img)

    return faces

def aligned_faces_for(img, size=320, padding=0.25):
    images = get_aligned_face_images(img, size, padding)
    faces = [None]*len(images)
    for each_index, each_img in enumerate(images):
        # Ask the detector to find the bounding boxes of each face. The 1 in the
        # second argument indicates that we should upsample the image 1 time. This
        # will make everything bigger and allow us to detect more faces.
        dets = detector(each_img, 1)
        # initialize by the number of faces
        faces = [None]*len(dets)
        for d in dets:
            faces[each_index] = Face(predictor(each_img, d), each_img)
    return faces


def get_aligned_face_images(img, size=320, padding=0.25):
    global detector
    global predictor

    # Ask the detector to find the bounding boxes of each face. The 1 in the
    # second argument indicates that we should upsample the image 1 time. This
    # will make everything bigger and allow us to detect more faces.
    dets = detector(img, 1)

    # if no faces return an empty list
    if len(dets) == 0:
        return []

    # Find the 5 face landmarks we need to do the alignment.
    faces = dlib.full_object_detections()
    for detection in dets:
        faces.append(predictor(img, detection))

    # returns a list of images
    return dlib.get_face_chips(img, faces, size=size, padding=padding)


def vector_points_for(jpg_image_path):
    global detector
    global predictor

    # load up the image
    img = dlib.load_rgb_image(jpg_image_path)

    # Ask the detector to find the bounding boxes of each face. The 1 in the
    # second argument indicates that we should upsample the image 1 time. This
    # will make everything bigger and allow us to detect more faces.
    dets = detector(img, 1)

    # initialize by the number of faces
    faces = [None]*len(dets)
    for index, d in enumerate(dets):
        shape = predictor(img, d)
        # copy over all 68 facial features/vertexs/points
        faces[index] = [ shape.part(each_part_index) for each_part_index in range(shape.num_parts) ]

    return faces
