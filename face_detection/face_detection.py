import cv2 as cv
face_cascade = cv.CascadeClassifier('haarcascade_frontalface_default.xml')
faces = face_cascade.detectMultiScale(image, scaleFactor=1.1, minNeighbors=1, minSize=(100, 100), flags = cv.CASCADE_SCALE_IMAGE)
if(len(faces)):
	(x,y,w,h) = faces[0]
	face = image[y:y+h,x:x+w]
	cv.rectangle(image, (x, y), (x+w, y+h), (0, 255, 0), 2) 
	final_face = cv.resize(face, (300,300), cv.INTER_CUBIC)
	input_face = final_face.astype(np.float32)
	input_face = input_face/255.0
	input_face = np.expand_dims(input_face, axis=0)
