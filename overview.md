1. topic: eyebrow raising
2. dataset:
   - record self
   - videos from youtube
3. Facial landmark
   -  add landmarks
4. labels
   - label frames as percent for eyebrow rasining
5. training
   - input = sequence of facial landmarks 
     - extract features
     - reduce the dimensionality to just the distance for each eye
     - try normalizing based on eye width or based on face height
     - auto ML tools, plug in parameters to
   - use an SVM 
   - output = true or false


talk to jiang about
- no prediction until after 10th frame
- how to affectively evaluate? more data, or method for visulizing basis for it's decision
- creating a face-prediction method
- trouble with certain frames
- having continuous output

done
- use average eye height instead of top of eye
- create a way to measure the score compared to the hand picked score
- create measure for mouth openness
- include eye openness
- use nose as vector
- favor the maximum
- have App show labels on hover

todo
- create a system for running this on a new video and labeling each frame
- create a system for parameter optimization

future plans
- create a polygon for wrikle detection 