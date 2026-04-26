from problem import factorial


def test_factorial_base_case():
    assert factorial(0) == 1
    assert factorial(1) == 1


def test_factorial_small():
    assert factorial(5) == 120


def test_factorial_larger():
    assert factorial(10) == 3628800
