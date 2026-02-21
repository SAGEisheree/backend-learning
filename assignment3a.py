def factorial(n):
    if n==0:
        return 1
    else:
        return factorial(n-1)*n
n=int(input("Enter a number: "))
print(f"Factorial of {n} is: {factorial(n)}")