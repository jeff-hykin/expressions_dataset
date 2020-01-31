from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__), '..', 'toolbox', 'tools.py')).read_text())

for each in FS.list_files(FS.dirname(__file__)+'/strange_face_detection'):
    if FS.extname(each) == '.png':
        *other_folders, strange_face_folder, filename, file_extension = FS.path_pieces(each)
        path = FS.join(*other_folders, "strange_faces_with_boxes", filename+file_extension)
        Image(each).with_facial_bounding_boxes().save(path)