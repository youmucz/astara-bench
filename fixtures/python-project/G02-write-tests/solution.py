def calculate_discount(price: float, customer_type: str) -> float:
    if customer_type == "vip":
        return price * 0.7
    elif customer_type == "member":
        return price * 0.85
    elif customer_type == "new":
        return price * 0.95
    else:
        return price
