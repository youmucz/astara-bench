# G03 - Extract Method
# BUG: A long unstructured function that needs refactoring
# into smaller helper methods.

def process_orders(orders):
    total = 0
    shipped = 0
    pending = 0
    for order in orders:
        if order["status"] == "shipped":
            total += order["amount"]
            shipped += 1
            if order["amount"] > 100:
                total -= 10
            if order["priority"] == "high":
                total += 5
        elif order["status"] == "pending":
            pending += 1
            if order["priority"] == "high":
                total += order["amount"] * 0.1
            if order["amount"] > 50:
                total += 2
        elif order["status"] == "cancelled":
            if order["amount"] > 200:
                total -= 5
    return {"total": total, "shipped": shipped, "pending": pending}
