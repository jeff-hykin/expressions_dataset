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
- performance, 71%, 30 minutes of processing
- how to affectively evaluate?
  - answer: create a video with the prediction overlayed
- is there a good way to see 
- improving performance
  - more data, or method for visulizing basis for it's decision
- no prediction until after 10th frame
- trouble with certain frames
- improving face-prediction method
- improving the optimization by having continuous output and a more strict measurement (true/false is a 50% guess)


todo
- create a video, with a label as the video is running
- small draft current approach
  - like a paper: define topic, explain why useful, the approach (dataset size), define features, then the SVM details, results, conclusions
  - include the problem
- create a system for running this on a new video and labeling each frame
- create a system for parameter optimization

future plans
- create a polygon for wrikle detection

done
- use average eye height instead of top of eye
- create a way to measure the score compared to the hand picked score
- create measure for mouth openness
- include eye openness
- use nose as vector
- favor the maximum
- have App show labels on hover




