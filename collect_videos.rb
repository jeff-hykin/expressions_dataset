require 'atk_toolbox'
require 'nokogiri'
require 'open-uri'

# this gets its value from the info.yaml file
path_to_urls = Info['paths']['all_urls']

def get_video_ids_for(url)
    return Hash[ Nokogiri::HTML.parse(open(url).read).css('*').map{ |each| each['href'] =~ /^\/watch\?v=(.+)/ && $1 }.compact.collect{ |item| [item, {}] } ]
end

def get_full_url(video_id)
    "https://www.youtube.com/watch?v=" + video_id
end

# just ids to random youtube videos
urls = JSON.load(FS.read(path_to_urls))

# create some threads for grabbing urls
threads = []
for each in 1..7
    threads.push Thread.new {
        loop do
            # pick a random video
            random_video_id = urls.keys.sample
            new_urls = get_video_ids_for(get_full_url(random_video_id))
            # add all it's urls to the main list
            urls.merge!(new_urls) { |key, v1, v2| v1 }
        end
    }
end

# create a thread for occasionally saving data to a file
url_file = File.open(path_to_urls)
threads.push Thread.new {
    loop do
        # wait a bit before writing to disk
        sleep 10
        # erase everything
        url_file.truncate(0)
        # overwrite with new stuff
        url_file.write(urls.to_json)
        # make sure the data gets saved
        url_file.flush()
    end
}


# get 1 million video urls
sleep 50 until urls.keys.size > 1_000_000
# close the file
url_file.close()
# end the program (which kills all threads)
exit