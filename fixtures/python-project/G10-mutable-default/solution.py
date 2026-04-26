def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items


def add_score(name, scores=None):
    if scores is None:
        scores = {}
    if name not in scores:
        scores[name] = []
    scores[name].append(10)
    return scores


def register_handler(event, handlers=None):
    if handlers is None:
        handlers = []
    handlers.append(event)
    return handlers
