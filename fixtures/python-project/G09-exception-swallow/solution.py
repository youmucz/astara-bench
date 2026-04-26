def parse_number(value):
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def read_file(filepath):
    try:
        with open(filepath, "r") as f:
            return f.read()
    except FileNotFoundError:
        return None
    except IOError as e:
        raise IOError(f"Failed to read file: {e}")


def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return 0
    except TypeError:
        raise TypeError("Arguments must be numbers")
