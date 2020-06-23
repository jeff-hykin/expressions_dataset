DEFAULT_DATABASE="$(node -e 'console.log(require("./package.json").parameters.database.DEFAULT_DATABASE)')"
DEFAULT_COLLECTION="$(node -e 'console.log(require("./package.json").parameters.database.DEFAULT_COLLECTION)')"
mongodump --db=$DEFAULT_DATABASE --collection=$DEFAULT_COLLECTION