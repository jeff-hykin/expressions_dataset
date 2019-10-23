
# for each parameter, have a scaling amount, and a default value
    # generate a random-normal value for each parameter
    # follow the best solution

from numpy.random import choice
import numpy as np
              
def king(parameters, population_growth, fitness_function):
    """
    parameters: [ (inital_value, parameter_scale), (inital_value, parameter_scale) ]
        a list of tuples, each one corrisponds to an argument in the fitness_function (below)
    population_growth:
        how many people are added to the king's kingdom
        usually keep this number above 4, but limit it to ~20x the thread count on your CPU
    fitness_function:
        a function
            - accepts some number of numeric arguments
            - every argument must handle negative and floating point values
                - this is necessary even if the fitness function just takes the floor/ceiling of a value
                  or just makes all negative values 0
            - returns a numeric value where a higher number indicates a better score
    """
    standard_deviations = [ each for _, each in parameters ]
    king_parameters = [ each for each, _ in parameters ]
    king_fitness = fitness_function(*king_parameters)
    king = (king_fitness, king_parameters)
    people = [ king ]
    
    while True:
        # 
        # pick a king from the population based on his fitness
        # 
        all_fitness = sum([ fitness for fitness, parameters in people ])
        probability_of_being_king = [ fitness/all_fitness for each in people ]
        king = choice(people, number_of_items_to_pick, p=probability_of_being_king)
        
        # remove the bottom 1/3 of the population
        if len(people > 3):
            people = sorted(people, key=lambda x: x[0])
            number_of_people_to_remove = int(len(people)/3.0)
            people = people[ number_of_people_to_remove: ]
        
        # generate a new population based on the king
        king_parameters = king[1]
        for each in range(population):
            # generate features
            person_parameters = []
            for each_index, each in enumerate(king_parameters):
                person_parameters.append(np.random.normal(loc=each, scale=standard_deviations[each_index]))
            
            # TODO: could probably run fitness in parallel 
            person_fitness = fitness_function(*person_parameters)
            people.append((person_fitness, person_parameters))
        
        # every iteration results in a generation of outcomes
        yield people