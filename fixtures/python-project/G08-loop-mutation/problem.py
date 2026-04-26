# G08 - Loop Mutation
# BUG: Modifying a list while iterating over it.

def remove_negatives(numbers):
    for i in range(len(numbers)):
        if numbers[i] < 0:
            numbers.pop(i)
    return numbers


def filter_invalid(items):
    for item in items:
        if item is None or item == "":
            items.remove(item)
    return items
