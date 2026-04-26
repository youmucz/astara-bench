# G04 - Error Handling
# BUG: File I/O operations lack exception handling.

def read_config(filepath):
    content = open(filepath, "r").read()
    lines = content.split("\n")
    config = {}
    for line in lines:
        if "=" in line:
            key, value = line.split("=", 1)
            config[key.strip()] = value.strip()
    return config


def save_config(filepath, config):
    f = open(filepath, "w")
    for key, value in config.items():
        f.write(f"{key}={value}\n")
    f.close()
