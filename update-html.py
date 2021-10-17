import os

ScriptTag = "<script src=\"/EldurWiki/loader.js\"></script>"
NoScript = "<noscript>JavaScript is required to load this page.</noscript>"

def AddCamelSpaces(s):
	escape = True
	i = 0
	while i < len(s):
		c = s[i]
		upper = c.upper()
		if (i > 0 and (not escape) and c == upper and c.lower() != upper):
			s = s[0:i] + " " + s[i:]
			i += 1
		elif (s[i] == '$'):
			prefix = s[0:i]
			s = "(" + prefix + ")" + s[i + 1:]
			i += 1
		escape = False
		if c == '-': escape = True
		i += 1
	return s

def GetHTML(title, description):
	return "<!DOCTYPE html><html><head><title>" + title + " | Eldur Wiki</title><meta charset=\"UTF-8\"><meta name=\"author\" content=\"Lucida Dragon\"><meta name=\"description\" content=\"" + description + "\">" + ScriptTag + "</head><body>" + NoScript + "</body></html>"

for subdir, dirs, files in os.walk("./wiki"):
	for file in files:
		if file == "index.html" and os.path.exists(os.path.join(subdir, "content.txt")):
			path = os.path.join(subdir, file)
			stream = open(path, mode="r")
			if ScriptTag in stream.read():
				stream.close()
				content = open(os.path.join(subdir, "content.txt"), mode="r")
				descLine = content.readline().strip()
				content.close()
				if not descLine[0].isalpha(): descLine = ""
				stream = open(path, mode="w")
				name = AddCamelSpaces(os.path.basename(subdir))
				if name == "wiki": name = "Home"
				stream.write(GetHTML(name, descLine))
				stream.close()
			stream.close()
