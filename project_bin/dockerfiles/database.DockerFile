FROM ubuntu:bionic-20200219

# ENV variables for language, and for running sibbiling docker containers (very important)
RUN apt-get update && \
    apt update && \
    apt install -y locales curl && \
    rm -rf /var/lib/apt/lists/*  && \
    localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8

ENV LANG=en_US.utf8 \
    LC_ALL=en_US.UTF-8 \
    DEBIAN_FRONTEND=noninteractive

# install nodejs, npm, mongodb, express
RUN apt-get update && \
    apt-get install -y wget && \
    apt-get install -y nodejs && \
    apt-get install -y npm && \
    apt-get install -y gnupg && \
    apt-get update && \
    wget -qO - https://www.mongodb.org/static/pgp/server-4.2.asc | apt-key add - && \
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.2 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.2.list && \
    apt-get update

RUN apt-get install -y mongodb-org=4.2.3 mongodb-org-server=4.2.3 mongodb-org-shell=4.2.3 mongodb-org-mongos=4.2.3 mongodb-org-tools=4.2.3 && \
    echo "mongodb-org hold" | dpkg --set-selections && \
    echo "mongodb-org-server hold" | dpkg --set-selections && \
    echo "mongodb-org-shell hold" | dpkg --set-selections && \
    echo "mongodb-org-mongos hold" | dpkg --set-selections && \
    echo "mongodb-org-tools hold" | dpkg --set-selections

RUN npm install -g nodemon

WORKDIR /project/

VOLUME [ "/data" ]

# start the mongodb service and the express server
CMD sh /project/start_database.sh