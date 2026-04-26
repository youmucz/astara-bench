# G10 - Mutable Default Argument
# BUG: Functions use mutable default arguments.
# Each call mutates the same list/dict.

def add_item(item, items=[]):
    items.append(item)
    return items


def add_score(name, scores={}):
    if name not in scores:
        scores[name] = []
    scores[name].append(10)
    return scores


def register_handler(event, handlers=[]):
    handlers.append(event)
    return handlers
