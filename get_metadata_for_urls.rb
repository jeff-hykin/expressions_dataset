require 'atk_toolbox'

def get_metadata_for(url)
    all_data = JSON.load(`youtube-dl -j '#{url}'`)
    return {
        duration: all_data["duration"],
        fps: all_data["fps"],
        height: all_data["height"],
        width: all_data["width"],
    }
end

def get_full_url(video_id)
    "https://www.youtube.com/watch?v=" + video_id
end

path_to_urls = Info["paths"]["all_urls"]

all_urls = JSON.load(FS.read(path_to_urls))
unchecked_keys = all_urls.keys.dup

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
                puts "there was an error on one of the videos, #{video}:\n#{exception}"
            end
        end
        # save changes every 100 urls
        if number_of_urls_remaining % 100 == 0
            FS.write(all_urls.to_json, to: path_to_urls)
            puts "#{number_of_urls_remaining} remaining"
        end
    end
end


# 
# multithreaded way
# 
# create some threads for grabbing metdata
threads = []
for each in 1..100
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

# wait for all of the threads to finish
threads.map{ |each| each.join() }