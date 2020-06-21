mongod --bind_ip 127.0.0.1 &
npm install
nodemon main.js &
tail -f /dev/null