FROM ruby:2.5 
# debian buster

# install curl and youtube-dl
RUN apt-get update && \
    apt update && \
    apt install -y locales curl && \
    rm -rf /var/lib/apt/lists/*  && \
    localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8 && \
    curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl && \
    chmod a+rx /usr/local/bin/youtube-dl 

# install the docker command
RUN apt-get update && \
    apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add - && \
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable" && \
    apt-get update && \
    apt-get install -y --allow-downgrades docker-ce docker-ce-cli containerd.io 

# install cmake
RUN apt install -y cmake 

# install python3
RUN apt update && \
    apt install -y python3-pip && \
    pip3 install --upgrade pip

# install dlib as its own layer since it takes so long
RUN pip3 install dlib

# install major pip modules (caffe, tensorflow, torch) since theyre so large
RUN apt-key adv --recv-keys --keyserver keyserver.ubuntu.com 886DDD89 && \
    add-apt-repository "deb http://ftp2.cn.debian.org/debian sid main contrib non-free" && \
    apt install -y caffe-cpu && \
    pip3 install torch==1.4.0 && \
    pip3 install tensorflow==2.1.0 && \
    pip3 install tensorflow-gpu==2.0.1

# install all the normal python packages
COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

# install all the needed ruby modules
COPY Gemfile Gemfile
RUN bundle install

# ENV variables 
    # for youtube-dl language
    # for running sibbiling docker containers (very important)
    # for docker-in-docker (also needed for sibbiling containers)
    # and for setting up python pathing for importing nearby files
ENV LANG=en_US.utf8 \
    LC_ALL=en_US.UTF-8 \
    PATH="/project/project_bin:${PATH}" \
    PYTHONPATH="$PYTHONPATH:/project"

# all of project files will be in /project
WORKDIR /project

# disable the default ruby entrypoint
ENTRYPOINT []