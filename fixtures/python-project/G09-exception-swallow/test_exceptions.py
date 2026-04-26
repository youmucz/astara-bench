from problem import parse_number, read_file, safe_divide
import tempfile
import os


def test_parse_number_valid():
    assert parse_number("42") == 42


def test_parse_number_invalid():
    assert parse_number("abc") is None


def test_read_file():
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
        f.write("hello")
        tmp = f.name
    try:
        assert read_file(tmp) == "hello"
    finally:
        os.unlink(tmp)


def test_read_file_not_found():
    assert read_file("/nonexistent/file.txt") is None


def test_safe_divide():
    assert safe_divide(10, 2) == 5


def test_safe_divide_by_zero():
    assert safe_divide(10, 0) == 0
