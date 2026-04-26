def search_items(query: str, limit: int = 10, case_sensitive: bool = False):
    results = []
    for item in ["apple", "Banana", "cherry", "Date"]:
        cmp_item = item if case_sensitive else item.lower()
        cmp_query = query if case_sensitive else query.lower()
        if cmp_query in cmp_item:
            results.append(item)
        if len(results) >= limit:
            break
    return results
