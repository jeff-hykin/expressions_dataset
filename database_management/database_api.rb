require 'net/http' #net/https does not have to be required anymore
require 'json'
require 'uri'

class EzDatabase
    def initialize(url)
        @url = url
    end
    
    def json_post(url, hash)    
        uri = URI(url)
        req = Net::HTTP::Post.new(uri, 'Content-Type' => 'application/json')
        req.body = hash.to_json
        res = Net::HTTP.start(uri.hostname, uri.port) do |http|
            http.request(req)
        end
    end
    
    def handle_response(value)
        data = JSON.parse(value.body)
        puts "data is: #{data} "
        value = data["value"]
        error = data["error"]
        if error != nil
            raise <<-HEREDOC.remove_indent
                
                
                Error from server: #{error}
            HEREDOC
        end
    end
    
    def set(key, value)
        self.handle_response(
            self.json_post(
                "#{@url}/set",
                {
                    key: key,
                    value: value
                }
            )
        )
    end
    
    def all()
        self.handle_response(
            self.json_post(
                "#{@url}/filter",
                {}
            )
        )
    end
end

local_database = EzDatabase.new("http://localhost:3000")
local_database.set("dummy1", "test value #1")
puts local_database.all()
