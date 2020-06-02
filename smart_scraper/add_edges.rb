require 'atk_toolbox'
require_relative Info.paths["ruby_tools"] # the (path) inside info.yaml 
require_relative Info.paths["database_api"] # the (path) inside info.yaml 

# try to fix bug
OpenSSL::SSL::SSLContext::DEFAULT_PARAMS[:options] |= OpenSSL::SSL::OP_NO_COMPRESSION
OpenSSL::SSL::SSLContext::DEFAULT_PARAMS[:ciphers] = "TLSv1.2:!aNULL:!eNULL"


# create some threads for grabbing urls
local_database = EzDatabase.new(Info["parameters"]["database"]["url"])
all_video_ids = local_database.keys
count = 0
threads = []

# create a thread for reporting
threads.push Thread.new {
    loop do
        # refresh number of keys
        all_video_ids = local_database.keys
        puts "count is: #{count} "
        sleep PARAMETERS["add_edges"]["reporting_frequency"]
    end
}
# create the actual work threads
for each in 1..PARAMETERS["add_edges"]["number_of_threads"]
    threads.push Thread.new {
        loop do
            begin
                # pick a random video
                random_video_id = all_video_ids.sample
                video_data = local_database[random_video_id]
                # skip dud videos
                if !video_data.is_a?(Hash)
                    next
                end
                # get the related videos
                new_urls = get_video_ids_for(get_full_url(random_video_id))
                # ensure a save space for it
                video_data["related_videos"].is_a?(Hash) or video_data["related_videos"] = {}
                # add all the related urls
                video_data["related_videos"] = video_data["related_videos"].merge(new_urls) do |key, old_related_video, new_related_video|
                    old_related_video
                end
                # send it to the database
                local_database[random_video_id] = video_data
                # increment
                count += 1
            # any error? wait a sec the retry
            rescue => exception
                puts <<~HEREDOC
                    
                    Hit an error in a thread (printed below)
                    Sleeping before retrying
                        
                        #{exception}
                    
                HEREDOC
                sleep 2
            end
        end
    }
end

# wait on all the threads
puts "Spinning up edge collection threads"
for each in threads
    each.join()
end