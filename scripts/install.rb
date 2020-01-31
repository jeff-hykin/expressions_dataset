require 'atk_toolbox'

# install all the python stuff
system 'pip install -r requirements.txt'
system 'gem install bundler'
if OS.is?("mac")
    system 'brew unlink ffmpeg'
    system 'brew cask install homebrew/cask-versions/adoptopenjdk8'
    # install ffmpeg with all options
    system "brew install ffmpeg $(brew options ffmpeg | grep -vE '\s' | grep -- '--with-' | tr '\n' ' ')"
end