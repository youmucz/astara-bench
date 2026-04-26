def read_config(filepath):
    try:
        with open(filepath, "r") as f:
            content = f.read()
    except FileNotFoundError:
        raise FileNotFoundError(f"Config file not found: {filepath}")
    except IOError as e:
        raise IOError(f"Failed to read config: {e}")

    lines = content.split("\n")
    config = {}
    for line in lines:
        if "=" in line:
            key, value = line.split("=", 1)
            config[key.strip()] = value.strip()
    return config


def save_config(filepath, config):
    try:
        with open(filepath, "w") as f:
            for key, value in config.items():
                f.write(f"{key}={value}\n")
    except IOError as e:
        raise IOError(f"Failed to save config: {e}")
