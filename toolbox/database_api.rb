
# 
# ez_database api
# 
# this file should stay independent of this specific project and should eventually go into a ruby gem
require 'net/http'
require 'json'
require 'uri'
require 'atk_toolbox'
KEY = Info["parameters"]["database"]["key"]

class EzDatabase
    def initialize(url)
        @url = url
    end
    
    def all()
        self.request(url: "#{@url}/all")
    end
    
    def get(*key_list)
        self.request(url: "#{@url}/get",  send: {keyList: key_list})
    end
    
    def merge(*key_list, with: nil)
        self.request(url: "#{@url}/merge", send: {keyList: key_list, value: with})
    end
    
    def bulk_merge(mergers)
        self.request(url: "#{@url}/bulkMerge", send: mergers)
    end
    
    def set(*key_list, to: nil)
        self.request(url: "#{@url}/set", send: {keyList: key_list, value: to})
    end

    def bulk_set(setters)
        self.request(url: "#{@url}/bulkSet", send: setters)
    end
    
    def delete(*key_list)
        self.request(url: "#{@url}/delete",  send: {keyList: key_list})
    end
    
    def size()
        self.request(url: "#{@url}/size")
    end
    
    def keys()
        self.request(url: "#{@url}/keys")
    end
    
    def sample(quantity)
        self.request(url: "#{@url}/sample", send: {quantity: quantity})
    end
    
    def find(query)
        self.request(url: "#{@url}/find", send: query)
    end
    
    def grab(search_filter: {}, return_filter: {})
        self.request(url: "#{@url}/grab", send: { "searchFilter" => search_filter, "returnFilter" => return_filter })
    end
    
    def eval(func_name, *args)
        self.request(url: "#{@url}/eval", send: {key: func_name.to_s, args: args})
    end
    
    def [](*key_list)
        return self.get(*key_list)
    end
    
    def []=(*key_list, value)
        return self.set(*key_list, to: value)
    end
    
    def json_post(url, hash)    
        uri = URI(url)
        req = Net::HTTP::Post.new(uri, 'Content-Type' => 'application/json')
        req.body = hash.to_json
        res = Net::HTTP.start(uri.hostname, uri.port) do |http|
            http.request(req)
        end
        return res
    end
    
    def handle_response(value)
        data = JSON.parse(value.body)
        value = data["value"]
        error = data["error"]
        exists = data["exists"]
        if error != nil
            raise <<~HEREDOC
                
                
                Error from server: #{error}
            HEREDOC
        end
        return value
    end
    
    def request(url:nil, send:nil)
        if send == nil
            send = {}
        end
        return self.handle_response(self.json_post(url, { args: send, key: KEY}))
    end
end