def probability_of_belonging(good_frame_count, bad_frame_count, ratio):
    return (ratio ** good_frame_count) * ((1-ratio) ** bad_frame_count)

def weighted_probability(good_frame_count, bad_frame_count, distribution):
    likelihoods = [ probability_of_belonging(number_of_hits, number_of_misses, each) for each in distribution ]
    total = sum(likelihoods)
    # normalize likelihoods to use them as weights
    likelihoods = [ each / total for each in likelihoods]
    weighted_amounts = [ each_ratio * each_likelihood for each_ratio, each_likelihood in zip(distribution, likelihoods) ]
    return sum(weighted_amounts)

def get_distribution(bucket_size, video_frame_labels):
    distribution = []
    start = 0
    end = bucket_size
    while end < video_frame_labels:
        start += bucket_size / 2
        end += bucket_size / 2
        segment = video_frame_labels[start:end]
        distribution.append((sum(segment)+0.0)/len(segment))
    
    return distribution


def get_distribution(videos):
    buckets = []
    distribution = []
    for index in range(2,100):
        bucket_size = index
        distribution = []
        distribution.append(distribution)
        for each in videos:
            distribution += get_distribution(bucket_size, videos.frame_labels)
    
# 
# example
# 
number_of_misses = 2
number_of_hits = 2
distribution_5 = [
    0.93,
    0.92,
    0.91,
    0.90,
    0.50,
    0.10,
    0.09,
    0.08,
]
print('sum(weighted_amounts) = ', weighted_probability(2, 2, distribution_5))