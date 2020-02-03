FROM ruby:2.5

# install curl and youtube-dl
RUN apt-get update && \
    apt update && \
    apt install -y locales curl && \
    rm -rf /var/lib/apt/lists/*  && \
    localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8 && \
    curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl && \
    chmod a+rx /usr/local/bin/youtube-dl 

# install all the needed ruby modules
COPY Gemfile Gemfile
RUN bundle install

# install all the python packages
COPY requirements.txt requirements.txt
# for some reason, combining this with the previous command causes it to fail (which is why it is seperate)
#    cmake is needed for the dlib pip module
RUN apt update && \
    apt install -y python3-pip && \
    pip3 install --upgrade pip && \
    apt install -y cmake && \
    pip3 install -r requirements.txt

# ENV variables 
    # for youtube-dl language
    # for running sibbiling docker containers (very important)
    # and for docker-in-docker (also needed for sibbiling containers)
ENV LANG=en_US.utf8 \
    LC_ALL=en_US.UTF-8 \
    PATH="/project/project_bin:${PATH}"

RUN apt-get update && \
    apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add - && \
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable" && \
    apt-get update && \
    apt-get install -y --allow-downgrades docker-ce docker-ce-cli containerd.io 
    
# all of project files will be in /project
WORKDIR /project

# disable the default ruby entrypoint
ENTRYPOINT []