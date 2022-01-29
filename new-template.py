import importlib, os, shutil

def main():
	root = os.getcwd().replace("\\", "/")
	if root.endswith("/"): root = root[0:len(root) - 1]

	if not root.endswith("EldurWiki"):
		print(f"Script must be run from the root EldurWiki directory. Current directory is: {root}")
		return

	article = input("Enter Article Name: ").strip()

	if len(article) == 0:
		print("Invalid article name.")
		return
	
	articlePath = f"{root}/wiki/{article}"
	if os.path.isdir(articlePath):
		print(f"Article already exists at \"{articlePath}\".")
		return

	template = input("Enter Template Name: ").strip()

	templatePath = f"{root}/templates/{template}.txt"
	if not os.path.isfile(templatePath):
		print(f"Template does not exist at \"{templatePath}\".")
		return

	try:
		os.mkdir(articlePath)
	except:
		print(f"Failed to create directory \"{articlePath}\". Check path and permissions.")
		return
	
	try:
		index = open(f"{articlePath}/index.html", "w")
		index.write("<script src=\"/EldurWiki/loader.js\"></script>")
		index.close()
	except:
		print(f"Failed to create index.html in \"{articlePath}\". Check path and permissions.")
		try: shutil.rmtree(articlePath)
		except: pass
		return
	
	try:
		templateFile = open(templatePath, "r")
		template = templateFile.read()
		templateFile.close()

		template = template.replace("[template:article_name]", article)

		contentFile = open(f"{articlePath}/content.txt", "w")
		contentFile.write(template)
		contentFile.close()
	except:
		print(f"Failed to create content.txt in \"{articlePath}\" from the template \"{templatePath}\". Check path and permissions.")
		try: shutil.rmtree(articlePath)
		except: pass
		return
	
	try:
		importlib.import_module("update-html")
	except:
		print("Warning: HTML metadata has not been updated. Please update the HTML metadata using update-html.py.")
	
	print("Done!")

main()