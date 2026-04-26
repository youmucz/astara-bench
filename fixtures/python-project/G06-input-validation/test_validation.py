from problem import register_user
import pytest


def test_register_user_valid():
    user = register_user("alice", "alice@example.com", 25)
    assert user["username"] == "alice"
    assert user["email"] == "alice@example.com"


def test_register_user_empty_username():
    with pytest.raises(ValueError):
        register_user("", "test@test.com", 20)


def test_register_user_invalid_email():
    with pytest.raises(ValueError):
        register_user("bob", "notanemail", 30)


def test_register_user_invalid_age():
    with pytest.raises(ValueError):
        register_user("charlie", "charlie@test.com", -5)
