FROM jrottenberg/ffmpeg:3.2-ubuntu

# ENV variables for language, and for running sibbiling docker containers (very important)
RUN apt-get update && \
    apt update && \
    apt install -y locales curl && \
    rm -rf /var/lib/apt/lists/*  && \
    localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8


ENV LANG=en_US.utf8 LC_ALL=en_US.UTF-8 PATH="/project/project_bin:${PATH}"
# all of project files will be in /project
WORKDIR /project

ENTRYPOINT [ "ffmpeg" ]