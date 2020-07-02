
backup_name="$1"

DEFAULT_DATABASE="$(node -e 'console.log(require("./package.json").parameters.database.DEFAULT_DATABASE)')"
DEFAULT_COLLECTION="$(node -e 'console.log(require("./package.json").parameters.database.DEFAULT_COLLECTION)')"

mongoimport --drop --db="$DEFAULT_DATABASE" --collection="$DEFAULT_COLLECTION" --file="$backup_name"