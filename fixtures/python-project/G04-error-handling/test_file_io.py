from problem import read_config, save_config
import os
import tempfile


def test_read_config():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".cfg", delete=False) as f:
        f.write("host=localhost\nport=8080\n")
        tmp = f.name
    try:
        config = read_config(tmp)
        assert config["host"] == "localhost"
        assert config["port"] == "8080"
    finally:
        os.unlink(tmp)


def test_read_config_not_found():
    try:
        read_config("/nonexistent/path.cfg")
    except FileNotFoundError:
        pass


def test_save_and_read():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".cfg", delete=False) as f:
        tmp = f.name
    try:
        save_config(tmp, {"key": "value"})
        config = read_config(tmp)
        assert config["key"] == "value"
    finally:
        os.unlink(tmp)
