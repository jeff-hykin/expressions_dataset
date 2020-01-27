require 'atk_toolbox'
require 'nokogiri'
require 'open-uri'
require_relative './helpers'

# this gets its value from the info.yaml file
path_to_urls = Info.paths['all_urls']
# just ids to random youtube videos
urls = JSON.load(FS.read(path_to_urls))

# create some threads for grabbing urls
puts "Spinning up url_collector threads"
threads = []
for each in 1..PARAMETERS["url_collector"]["number_of_threads"]
    threads.push Thread.new {
        loop do
            # pick a random video
            random_video_id = urls.keys.sample
            new_urls = get_video_ids_for(get_full_url(random_video_id))
            # add all it's urls to the main list
            urls = urls.merge(new_urls) { |key, v1, v2| v1 }
        end
    }
end

# create a thread for reporting and saving data to a file
threads.push Thread.new {
    loop do
        # record the number of URLs
        puts urls.keys.size
        # wait a bit before writing to disk
        sleep PARAMETERS["url_collector"]["save_to_file_frequency"]
        # overwrite the file
        FS.write(urls.to_json, to: path_to_urls)
        # check the end condition
        if number_of_urls > PARAMETERS['max_number_of_urls']
            exit
        end
    end
}