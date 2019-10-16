1. topic: eyebrow raising
2. dataset:
   - record self
   - videos from youtube
3. Facial landmark
   -  add landmarks
4. labels
   - label frames as true or false for eyebrow rasining
5. training
   - input = sequence of facial landmarks 
     - extract features
     - reduce the dimensionality to just the distance for each eye
     - try normalizing based on eye width or based on face height
     - auto ML tools, plug in parameters to
   - use an SVM 
   - output = true or false


todo
- use average eye height instead of top of eye
- create a way to measure the score compared to the hand picked score
- create measure for mouth openness
- include eye openness
- use nose as vector
- favor the maximum


future plans
- create a polygon for wrikle detection 