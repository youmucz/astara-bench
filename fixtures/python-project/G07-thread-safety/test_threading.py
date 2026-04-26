from problem import run_threads


def test_counter_thread_safety():
    result = run_threads()
    assert result == 10000, f"Expected 10000, got {result}"
