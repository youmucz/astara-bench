# G05 - Signature Fix
# BUG: Function signature has wrong parameter types
# causing runtime errors when used.

def search_items(query: str, limit: str, case_sensitive: str):
    results = []
    count = int(limit)
    sensitive = case_sensitive == "True"
    for item in ["apple", "Banana", "cherry", "Date"]:
        cmp_item = item if sensitive else item.lower()
        cmp_query = query if sensitive else query.lower()
        if cmp_query in cmp_item:
            results.append(item)
        if len(results) >= count:
            break
    return results
