# running this will start several threads making requests to get metadata for any videos that are missing metadata 

require 'atk_toolbox'
require_relative Info.paths["ruby_tools"] # the (path) inside info.yaml 

all_urls = JSON.load(FS.read($paths["all_urls"]))

# find all the not-already-checked videos
unchecked_keys = all_urls.keys.select do |each|
    all_urls[each].is_a?(Hash) && all_urls[each]["duration"] == nil && ! all_urls[each]["unavailable"]
end.dup

# 
# TODO: make this process continuous, right now it just gets an initial snapshot of the data and then overwrites the file
# 

save_metadata = ->() do
    while (video = unchecked_keys.pop()) != nil
        number_of_urls_remaining = unchecked_keys.size()
        metadata = all_urls[video]
        # if the metadata hasn't been downloaded yet
        if metadata.is_a?(Hash) && metadata["duration"] == nil
            begin
                # download the metadata
                url = get_full_url(video)
                # get the new metadata
                metadata = get_metadata_for(url)
                # update the metadata for that video
                all_urls[video].merge!(metadata)
            rescue => exception
                # if there was an error in the thread, just let the thread close. Dont stop the whole program
                puts "    there was an error on one of the videos, #{video}:\n        #{exception}".yellow
                if metadata.keys.size == 0
                    all_urls[video] = nil
                end
            end
        end
    end
end

# 
# multithread spinup
# 
# create some threads for grabbing metdata
threads = []
# create the metadata gatherers
for each in 1..PARAMETERS["add_metadata"]["number_of_threads"]
    thread_number = each.to_i
    threads.push Thread.new {
        begin
           save_metadata[]
        rescue => exception
            # if there was an error in the thread, just let the thread close. Dont stop the whole program
            puts "there was an error on one of the threads:\n#{exception}"
        end
    }
end

# create a thread for occasionally saving data to a file
threads.push Thread.new {
    loop do
        puts "Saving to disk. #{unchecked_keys.size()} urls remaining".blue
        # wait a bit before writing to disk
        sleep PARAMETERS["add_metadata"]["save_to_file_frequency"]
        # overwrite the file
        FS.write(all_urls.to_json, to: $paths["all_urls"])
    end
}

# wait for all of the threads to finish
threads.map{ |each| each.join() }