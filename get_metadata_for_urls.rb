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
# create some threads for grabbing metdata
threads = []
for each in 1..50
    threads.push Thread.new {
        begin
            # while there are videos left
            while (video = unchecked_keys.pop()) != nil
                metadata = all_urls[video]
                # if the metadata hasn't been downloaded yet
                if metadata.is_a?(Hash) && metadata["duration"] == nil
                    # download the metadata
                    url = get_full_url(video)
                    # get the new metadata
                    metadata = get_metadata_for(url)
                    # update the metadata for that video
                    all_urls[video].merge!(metadata)
                end
            end
        rescue => exception
            # if there was an error in the thread, just let the thread close. Dont stop the whole program
            puts "there was an error on one of the threads:\n#{exception}"
        end
    }
end

# create a thread for occasionally saving data to a file
threads.push Thread.new {
    while unchecked_keys.size() > 0
        # wait a bit before writing to disk
        sleep 5
        # overwrite the file
        FS.write(all_urls.to_json, to: path_to_urls)
        puts "#{unchecked_keys.size()} remaining"
    end
}

# wait for all of the threads to finish
threads.map{ |each| each.join() }