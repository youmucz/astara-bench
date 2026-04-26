from problem import remove_negatives, filter_invalid


def test_remove_negatives():
    result = remove_negatives([1, -2, 3, -4, 5])
    assert result == [1, 3, 5]


def test_remove_negatives_all_positive():
    result = remove_negatives([1, 2, 3])
    assert result == [1, 2, 3]


def test_filter_invalid():
    result = filter_invalid([1, None, 2, "", 3])
    assert result == [1, 2, 3]
