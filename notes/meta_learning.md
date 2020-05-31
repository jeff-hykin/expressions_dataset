



Black-Box Adaptaion

```ruby


def build_black_box(task_datasets)
    # input = D_i^train
    
    
    meta_network = Network.new()
    meta_network.theta = [[]] # all of the weights
    
    # create the meta training dataset
    main_network.meta_train_data = [
        split_50_50(task_datasets[0]), # creates basic training set and basic test setup
        split_50_50(task_datasets[1]),
        split_50_50(task_datasets[2]),
    ]

    # aka f_theta
    main_network.generate_sub_network_weights = ->(training_data) do
        self.phi = []
        for each in training_data
            self.phi.push(:unknown_value)
        end
        return phi
    end
    
    # generate all the phi's
    main_network.phi_i = main_network.generate_sub_network_weights[ main_network.meta_train_data ]

    # create a single network
    main_network.generate_sub_network = ->(which_task, a_training_dataset) do 
        this_networks_weights = self.phi_i[which_task] # g_of_phi_i
        network = Network.new(this_networks_weights)
        network.train_on(a_training_dataset)
        
        return ->(single_input) do
            return network.predict(single_input)
        end
    end
    
    
    
end

```