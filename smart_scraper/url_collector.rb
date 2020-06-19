require 'atk_toolbox'
require_relative Info.paths["ruby_tools"] # the (path) inside info.yaml 
require_relative Info.paths["database_api"] # the (path) inside info.yaml 

# try to fix bug
OpenSSL::SSL::SSLContext::DEFAULT_PARAMS[:options] |= OpenSSL::SSL::OP_NO_COMPRESSION
OpenSSL::SSL::SSLContext::DEFAULT_PARAMS[:ciphers] = "TLSv1.2:!aNULL:!eNULL"

local_database = EzDatabase.new(Info["parameters"]["database"]["url"])
stats = {
    time_passed: 0,
    start_time: Time.new.to_i,
    current_time: Time.new.to_i,
    added_urls: [],
    secondary_urls: [],
}


# provide an initial random starting points
number_of_samples = 3*PARAMETERS["url_collector"]["number_of_threads"]
urls_to_check = local_database.sample(number_of_samples)

# create some threads for grabbing urls
puts "Spinning up url_collector threads"
threads = []
#
# refresher thread
#
# create a thread for reporting and saving data to a file
threads.push Thread.new {
    loop do
        begin
            # wait a bit before writing to disk
            sleep PARAMETERS["url_collector"]["save_to_file_frequency"]
            
            # save the stats
            puts "saving url_collector stats to: #{$paths["url_collector_runtime_stats"]}"
            stats[:current_time] = Time.new.to_i
            stats[:time_passed] = stats[:current_time] - stats[:start_time]
            FS.write(stats.to_yaml, to: $paths["url_collector_runtime_stats"])
        rescue => exception
            puts <<~HEREDOC
                    
                Hit an error in the print thread (printed below)
                Sleeping before retrying
                    
                    #{exception}
                
            HEREDOC
            sleep 2
        end
    end
}
for each in 1..PARAMETERS["url_collector"]["number_of_threads"]
    threads.push Thread.new {
        loop do
            begin
                # pick a random video
                random_video_id = urls_to_check.sample(1)[0]
                # remove it from the checklist (will remove all instances if duplicated)
                urls_to_check.delete(random_video_id)
                stats[:added_urls].push(random_video_id)
                stats[:secondary_urls].delete(random_video_id)
                # get related videos
                urls_to_related_videos = get_video_ids_for(get_full_url(random_video_id))
                # add all of them to the checklist (so long as it isn't gigantic)
                urls_to_check += urls_to_related_videos.keys if urls_to_check.size < 10000
                # all the data that will be sent to the database
                new_data = [
                    { keyList: [ random_video_id, "related_videos" ], value: urls_to_related_videos },
                ]
                # add the other videos (assume the related-ness is a two-way street)
                for each_key, each_value in urls_to_related_videos
                    related_video = { keyList: [ each_key, "related_videos" ], value: { random_video_id: {}} }
                    new_data.push(related_video)
                    stats[:secondary_urls].push(each_key)
                end
                # send the info to the database
                # use merge encase some video data already existed (concurrently)
                local_database.bulk_merge(new_data)
            # any error? just restart the process (or basically become recursive)
            rescue => exception
                puts <<~HEREDOC
                    
                    Hit an error in a thread (printed below)
                    Sleeping before retrying
                        
                        #{exception}
                    
                HEREDOC
                raise exception
                exit(1)
                sleep 2
            end
        end
    }
end

# wait on all the threads
for each in threads
    each.join()
end