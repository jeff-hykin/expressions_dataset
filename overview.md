

todo
- train the SVN at each lookback frame level 9-0
- create a function that labels all frames in a video
- create a video with frame data overlayed
- small draft current approach
  - like a paper:
    - define topic, 
    - explain why solution would be useful, 
    - the approach
      - data set
      - tools (SVM)
      - feature development
      - results/performance
        - include the problem with missed frames and starting frames
      - conclusions

todo later
- label more training data using random (not 10th frames)
- create an SVN for every 10% to get a 0-10 output
- save the labelled data to JSON to a file
- adjust video labeller GUI
  - iterate over labelled video frames
  - generate images for randomly selected frames
  - ask for the label, and record it
- switch to better facial recognition
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
- issue with particular thresholds not having enough
- performance, 71%, 30 minutes of processing
- how to affectively evaluate?
  - answer: create a video with the prediction overlayed
- improving performance
  - more data, or method for visulizing basis for it's decision
- no prediction until after 10th frame
- trouble with certain frames
- improving face-prediction method
- improving the optimization by having continuous output and a more strict measurement (true/false is a 50% guess)
