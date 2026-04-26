# G06 - Input Validation
# BUG: Function accepts any input without validation.

def register_user(username, email, age):
    user_id = len(username) + hash(email) % 10000
    return {
        "id": user_id,
        "username": username,
        "email": email,
        "age": age,
    }
