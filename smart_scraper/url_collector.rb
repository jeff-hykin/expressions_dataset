require 'atk_toolbox'
require_relative Info.paths["ruby_tools"] # the (path) inside info.yaml 
require_relative Info.paths["database_api"] # the (path) inside info.yaml 

local_database = EzDatabase.new(Info["parameters"]["database"]["url"])

# TODO: replace this once the database is querable
# just ids to random youtube videos
urls = JSON.load(FS.read($paths['all_urls']))
# create some threads for grabbing urls
puts "Spinning up url_collector threads"
threads = []
for each in 1..PARAMETERS["url_collector"]["number_of_threads"]
    threads.push Thread.new {
        loop do
            # pick a random video
            random_video_id = urls.keys.sample
            new_urls = get_video_ids_for(get_full_url(random_video_id))
            urls[random_video_id]["related_videos"] = new_urls
            # add all it's urls to the main list
            urls = urls.merge(new_urls) do |key, old_value, new_value|
                # make sure the hash exists
                old_value["related_videos"].is_a?(Hash) or old_value["related_videos"] = {}
                # add new keys
                old_value["related_videos"].merge(new_urls) { |key, old_value, new_value| old_value }
            end
            # send it to the database as well
            local_database[random_video_id] = urls[random_video_id]
        end
    }
end

# create a thread for reporting and saving data to a file
threads.push Thread.new {
    loop do
        # record the number of URLs
        number_of_urls = urls.keys.size
        puts number_of_urls
        # wait a bit before writing to disk
        sleep PARAMETERS["url_collector"]["save_to_file_frequency"]
        # overwrite the file
        FS.write(urls.to_json, to: $paths['all_urls'])
        # check the end condition
        if number_of_urls > PARAMETERS['max_number_of_urls']
            exit
        end
    end
}

# wait on all the threads
for each in threads
    each.join()
end