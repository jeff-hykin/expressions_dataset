
# 
# ez_database api
# 
# this file should stay independent of this specific project and should eventually go into a ruby gem
require 'net/http'
require 'json'
require 'uri'

class EzDatabase
    def initialize(url)
        @url = url
    end
    
    def all()
        self.handle_response(
            self.json_post(
                "#{@url}/all",
                {}
            )
        )
    end
    
    def get(key)
        self.handle_response(
            self.json_post(
                "#{@url}/get",
                {
                    key: key,
                }
            )
        )
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

    def delete(key)
        self.handle_response(
            self.json_post(
                "#{@url}/delete",
                {
                    key: key,
                }
            )
        )
    end
    
    def size()
        self.handle_response(
            self.json_post(
                "#{@url}/size",
                {}
            )
        )
    end
    
    def keys()
        self.handle_response(
            self.json_post(
                "#{@url}/keys",
                {}
            )
        )
    end
    
    def eval(key, args)
        self.handle_response(
            self.json_post(
                "#{@url}/eval",
                {
                    key: key.to_s,
                    args: args,
                }
            )
        )
    end
    
    def [](key)
        return self.get(key)
    end
    
    def []=(key, value)
        return self.set(key, value)
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
        value = data["value"]
        error = data["error"]
        exists = data["exists"]
        if error != nil
            raise <<-HEREDOC.remove_indent
                
                
                Error from server: #{error}
            HEREDOC
        end
        return value
    end
end