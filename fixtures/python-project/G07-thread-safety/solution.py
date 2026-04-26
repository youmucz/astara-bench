import threading

counter = 0
lock = threading.Lock()


def increment_counter():
    global counter
    for _ in range(1000):
        with lock:
            counter += 1


def run_threads():
    threads = []
    for _ in range(10):
        t = threading.Thread(target=increment_counter)
        threads.append(t)
        t.start()
    for t in threads:
        t.join()
    return counter
