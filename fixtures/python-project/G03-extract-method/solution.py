def _apply_shipping_discount(order):
    discount = 0
    if order["amount"] > 100:
        discount = 10
    if order["priority"] == "high":
        discount -= 5
    return discount


def _calculate_pending_bonus(order):
    bonus = 0
    if order["priority"] == "high":
        bonus = order["amount"] * 0.1
    if order["amount"] > 50:
        bonus += 2
    return bonus


def _calculate_cancellation_penalty(order):
    if order["amount"] > 200:
        return 5
    return 0


def process_orders(orders):
    total = 0
    shipped = 0
    pending = 0
    for order in orders:
        if order["status"] == "shipped":
            total += order["amount"]
            shipped += 1
            total -= _apply_shipping_discount(order)
        elif order["status"] == "pending":
            pending += 1
            total += _calculate_pending_bonus(order)
        elif order["status"] == "cancelled":
            total -= _calculate_cancellation_penalty(order)
    return {"total": total, "shipped": shipped, "pending": pending}
