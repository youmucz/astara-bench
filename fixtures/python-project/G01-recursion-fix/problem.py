# G01 - Recursion Fix
# BUG: Missing base case causes infinite recursion

def factorial(n):
    return n * factorial(n - 1)
