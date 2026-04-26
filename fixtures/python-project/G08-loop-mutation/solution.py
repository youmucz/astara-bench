def remove_negatives(numbers):
    return [n for n in numbers if n >= 0]


def filter_invalid(items):
    return [item for item in items if item is not None and item != ""]
