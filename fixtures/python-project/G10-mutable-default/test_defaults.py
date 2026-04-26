from problem import add_item, add_score, register_handler


def test_add_item_new_list():
    result = add_item(1)
    assert result == [1]


def test_add_item_fresh_calls():
    r1 = add_item("a")
    r2 = add_item("b")
    assert r1 != r2


def test_add_score():
    scores = add_score("alice")
    assert scores["alice"] == [10]


def test_add_score_isolated():
    s1 = add_score("x")
    s2 = add_score("y")
    assert "x" in s1
    assert "y" in s2


def test_register_handler():
    result = register_handler("click")
    assert result == ["click"]
