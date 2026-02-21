import math
def task(number):
    a=math.sqrt(number)
    b=math.log(number)
    c=math.sin(number)
    return a,b,c
number = int(input("Enter a number: "))
x,y,z=task(number)
print(f"Square root:{x}\nLogarithm:{y}\nSine:{z}")
