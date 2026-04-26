from problem import process_orders


def test_process_orders_shipped():
    orders = [
        {"status": "shipped", "amount": 150, "priority": "high"},
        {"status": "shipped", "amount": 50, "priority": "low"},
    ]
    result = process_orders(orders)
    assert result["shipped"] == 2
    assert result["pending"] == 0
    assert result["total"] == 195


def test_process_orders_pending():
    orders = [
        {"status": "pending", "amount": 60, "priority": "high"},
        {"status": "pending", "amount": 100, "priority": "low"},
    ]
    result = process_orders(orders)
    assert result["pending"] == 2


def test_process_orders_mixed():
    orders = [
        {"status": "shipped", "amount": 80, "priority": "low"},
        {"status": "pending", "amount": 40, "priority": "low"},
        {"status": "cancelled", "amount": 250, "priority": "low"},
    ]
    result = process_orders(orders)
    assert result["shipped"] == 1
    assert result["pending"] == 1
