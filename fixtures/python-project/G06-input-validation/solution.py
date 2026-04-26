def register_user(username, email, age):
    if not username or not isinstance(username, str) or len(username) < 3:
        raise ValueError("Username must be at least 3 characters")
    if not email or "@" not in email:
        raise ValueError("Invalid email address")
    if not isinstance(age, int) or age < 0 or age > 150:
        raise ValueError("Age must be between 0 and 150")

    user_id = len(username) + hash(email) % 10000
    return {
        "id": user_id,
        "username": username,
        "email": email,
        "age": age,
    }
