# Expression Dataset

## Setup
- Install docker
- Start docker (open console and run `docker --version` to check)
- Install Ruby ≥2.5.5
- Run `gem install atk_toolbox` to add the atk_toolbox library to ruby
- Clone this repo `git clone https://github.com/jeff-hykin/expressions_dataset`
- Open up the repo (`cd expressions_dataset`) and run the setup script `ruby scripts/setup_database.rb`
- Download the database content from [here](https://drive.google.com/file/d/1qiSHxJAkVuNt9XjQWNZhXey3DmyakWcN/view?usp=sharing)
- Move that `backup.json` file to `expressions_dataset/database_management/express_server/backups.nosync/backup.json`
- Start the database service with `ruby scripts/start_database.rb`
- Inside the database service (might need to press enter once) run `./actions/import_backup backups.nosync/backup.json`

Once that is completed, the database service should be running on localhost, port 3000. To check if it is running, try running `curl localhost:3000/` 


## Usage
For using the database once it is setup and running, see:
https://github.com/jeff-hykin/iilvd_interface