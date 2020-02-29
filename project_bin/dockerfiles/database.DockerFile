FROM ubuntu:bionic-20200219

# ENV variables for language, and for running sibbiling docker containers (very important)
RUN apt-get update && \
    apt update && \
    apt install -y locales curl && \
    rm -rf /var/lib/apt/lists/*  && \
    localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8 && \
    apt-get update && \
    apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add - && \
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" && \
    apt-get update && \
    apt-get install -y --allow-downgrades docker-ce docker-ce-cli containerd.io

ENV LANG=en_US.utf8 \
    LC_ALL=en_US.UTF-8 \
    PATH="/project/project_bin:${PATH}" \
    DEBIAN_FRONTEND=noninteractive

# all of project files will be in /project
WORKDIR /project

ENTRYPOINT [ ]


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
    echo "mongodb-org-tools hold" | dpkg --set-selections && \
    mkdir -p /data/db    

# create a script for both starting mongo and the express.js server
RUN echo "mongod --bind_ip 127.0.0.1 &" >> /root/start_database.sh && \
    echo "node database_management/express_server/index.js" >> /root/start_database.sh && \
    chmod u+x /root/start_database.sh

# start the mongodb service and the express server
CMD sh /root/start_database.sh

# install all the npm packages 
RUN npm install mongodb express --save