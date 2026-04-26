# G09 - Exception Swallowing
# BUG: Bare except clauses swallow all exceptions silently.

def parse_number(value):
    try:
        return int(value)
    except:
        pass


def read_file(filepath):
    try:
        with open(filepath, "r") as f:
            return f.read()
    except:
        return None


def safe_divide(a, b):
    try:
        return a / b
    except:
        return 0
