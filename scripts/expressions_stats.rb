require 'atk_toolbox'


for each_key, each_value in Info['expressions']
    puts "#{each_key}, #{each_value["number_of_examples"]}, #{each_value["number_of_urls"]}"
end