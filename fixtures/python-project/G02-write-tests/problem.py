# G02 - Write Tests
# The implementation is correct but has no tests.
# Agent must write pytest tests covering edge cases.

def calculate_discount(price: float, customer_type: str) -> float:
    if customer_type == "vip":
        return price * 0.7
    elif customer_type == "member":
        return price * 0.85
    elif customer_type == "new":
        return price * 0.95
    else:
        return price
