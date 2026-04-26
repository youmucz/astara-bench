from problem import search_items


def test_search_items_basic():
    results = search_items("apple", "5", "False")
    assert "apple" in results


def test_search_items_case_insensitive():
    results = search_items("ban", "5", "False")
    assert "Banana" in results


def test_search_items_limit():
    results = search_items("a", "2", "False")
    assert len(results) <= 2
