from math import cos, pi, sin

count = 100
size = 100
radius = 12.5
percent = 0.75

f = open("./styles/spinner.svg", "w")
f.write(f"<svg viewBox=\"0 0 {size} {size}\" xmlns=\"http://www.w3.org/2000/svg\">\n")
f.write(f"\t<path d=\"M {size / 2} {size - (radius * 2)} ")
f.write(f"A {radius} {radius} 0 0 1 {size / 2} {size} ")
for i in range(count):
	dx = -sin((i / count) * 2 * pi * percent)
	dy = cos((i / count) * 2 * pi * percent)
	x = dx * ((size / 2) - radius) + (size / 2.0) + (dx * radius * (1 - (i / count)))
	y = dy * ((size / 2) - radius) + (size / 2.0) + (dy * radius * (1 - (i / count)))
	f.write(f"L {x} {y} ")
for i in range(count):
	i = count - i
	dx = -sin((i / count) * 2 * pi * percent)
	dy = cos((i / count) * 2 * pi * percent)
	x = dx * ((size / 2) - radius) + (size / 2.0) - (dx * radius * (1 - (i / count)))
	y = dy * ((size / 2) - radius) + (size / 2.0) - (dy * radius * (1 - (i / count)))
	f.write(f"L {x} {y} ")
f.write("\" fill=\"black\" opacity=\"0.5\">")
f.write("</svg>")
f.close()