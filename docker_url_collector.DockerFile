FROM ruby:2.5

# install all the needed ruby modules
RUN gem install zlib atk_toolbox selenium-webdriver webdrivers activesupport nokogiri statistics2

# ensure curl is avalible
RUN apt-get update && apt-get install -y curl

# install youtube-dl
RUN curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl
RUN chmod a+rx /usr/local/bin/youtube-dl

WORKDIR /project

ENTRYPOINT [ "ruby" ]