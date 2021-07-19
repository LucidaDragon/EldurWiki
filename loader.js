const onWikiLoaded = new Event("wikiLoaded");
const WikiName = "EldurWiki";
const WikiPath = "/" + WikiName;

function Splice(str, index, count, add)
{
	if (index < 0)
	{
		index = str.length + index;

		if (index < 0) index = 0;
	}
 
	return str.slice(0, index) + (add || "") + str.slice(index + count);
}

function AddCamelSpaces(str)
{
	let escape = true;
	for (let i = 0; i < str.length; i++)
	{
		let c = str[i];
		let upper = c.toUpperCase();
		if (i > 0 && !escape && c === upper && c.toLowerCase() !== upper)
		{
			str = Splice(str, i, 0, ' ');
			i++;
		}
		else if (str[i] === '$')
		{
			let prefix = str.substr(0, i);
			str = `(${prefix})${str.substr(i + 1)}`;
			i++;
		}

		escape = false;

		if (c === '-') escape = true;
	}

	return str;
}

function RemoveCamelSpaces(str)
{
	return str.replace(/ /g, "");
}

function EscapeHtml(unsafe)
{
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function CreateLink(url, text)
{
	let link = document.createElement("a");
	link.href = url;
	if (text !== undefined) link.appendChild(document.createTextNode(AddCamelSpaces(text)));
	TestRequest(url, function() {}, function()
	{
		link.style.color = "red";
	});
	return link;
}

function LoadPath()
{
	let path = window.location.pathname.split("/");

	if (path[path.length - 1] === "index.html" || path[path.length - 1] === "")
	{
		wikipage.name = path[path.length - 2];
	}
	else
	{
		wikipage.name = path[path.length - 1];
	}
}

function LoadTitle()
{
	let title = wikipage.name;

	if (title.toLowerCase() === "wiki") title = "WikiHome";

	title = AddCamelSpaces(title);

	wikipage.title = title;
	document.title = title;
}

function LoadIcon()
{
	let icon = document.createElement("link");
	icon.setAttribute("rel", "icon");
	icon.setAttribute("href", WikiPath + "/styles/icon.png");

	document.head.appendChild(icon);
}

function LoadStyles()
{
	let defaultStyle = document.createElement("link");
	defaultStyle.setAttribute("rel", "stylesheet");
	defaultStyle.setAttribute("href", WikiPath + "/styles/default.css");

	let pageStyle = document.createElement("link");
	pageStyle.setAttribute("rel", "stylesheet");
	pageStyle.setAttribute("href", `${WikiPath}/styles/${wikipage.name}.css`);

	document.head.appendChild(defaultStyle);
	document.head.appendChild(pageStyle);
}

function TestRequest(url, onSuccess, onError)
{
	let request = new XMLHttpRequest();
	request.open("HEAD", url);
	request.onreadystatechange = function()
	{
		if (request.readyState === XMLHttpRequest.DONE)
		{
			if (request.status === 0 || (request.status >= 200 && request.status < 400))
			{
				onSuccess();
			}
			else
			{
				onError(request.status);
			}
		}
	};
	request.send();
}

function GetRequest(url, onContentReceived, onError, type="json")
{
	let request = new XMLHttpRequest();
	request.responseType = type;
	request.open("GET", url);
	request.onreadystatechange = function()
	{
		if (request.readyState === XMLHttpRequest.DONE)
		{
			if (request.status === 0 || (request.status >= 200 && request.status < 400))
			{
				if (request.response === null)
				{
					onError(406);
				}
				else
				{
					onContentReceived(request.response);
				}
			}
			else
			{
				onError(request.status);
			}
		}
	};
	request.send();
}

function RequestContent(onContentReceived, onError, source=".")
{
	GetRequest(`${source}/content.txt`, function(content)
	{
		onContentReceived(BuildTextTree(content));
	},
	function(code)
	{
		GetRequest(`${source}/content.json`, onContentReceived, onError)
	}, "text");
}

function RequestSidebar(onContentReceived, onError)
{
	GetRequest(WikiPath + "/wiki/sidebar.txt", function(content)
	{
		onContentReceived(BuildTextTree(content));
	},
	function(code)
	{
		GetRequest(WikiPath + "/wiki/sidebar.json", onContentReceived, onError);
	}, "text");
}

function LoadParagraphs(at, paragraphs, toc, headerDepth, address, usePTag, rootHeaderLink)
{
	if (paragraphs === undefined || paragraphs === null) return;

	if (headerDepth === undefined) headerDepth = 2;

	if (address === undefined) address = [];

	if (usePTag === undefined) usePTag = true;

	if (typeof paragraphs === "string")
	{
		let elements = [];
		let inLink = false;
		let start = 0;

		for (let i = 0; i < paragraphs.length; i++)
		{
			if (inLink)
			{
				if (paragraphs[i] === ']')
				{
					let name = paragraphs.substr(start, i - start);

					if (name.toLowerCase().startsWith("image:"))
					{
						let img = document.createElement("img");
						img.className = "image";
						img.src = `${WikiPath}/images/${name.split(':', 2)[1]}`;
						elements.push(img);
					}
					else if (name.toLowerCase().startsWith("sub:"))
					{
						let subRoot = document.createElement("div");
						let subArticleName = name.split(':', 2)[1];
						elements.push(subRoot);

						RequestContent(function(subContent)
						{
							let subArticle = {};
							subArticle.Header = AddCamelSpaces(subArticleName);
							subArticle.Sections = [
								subContent.Description,
								subContent.Sections
							];

							LoadParagraphs(subRoot, subArticle, toc, headerDepth, address, usePTag, `${WikiPath}/wiki/${subArticleName}`);
						},
						function(code)
						{
							subRoot.appendChild(document.createTextNode(`[Could not load sub-article \"${subArticleName}\" (Error ${code})]`));
						}, `${WikiPath}/wiki/${subArticleName}`);
					}
					else
					{
						elements.push(CreateLink(`${WikiPath}/wiki/${name}`, name));
					}

					start = i + 1;
					inLink = false;
				}
			}
			else
			{
				if (paragraphs[i] === '[')
				{
					elements.push(document.createTextNode(paragraphs.substr(start, i - start)));

					start = i + 1;
					inLink = true;
				}
				else if (i === paragraphs.length - 1)
				{
					elements.push(document.createTextNode(paragraphs.substr(start, (i - start) + 1)));
				}
			}
		}

		if (usePTag)
		{
			let p = document.createElement("p");
			 
			for (let i = 0; i < elements.length; i++)
			{
				p.appendChild(elements[i]);
			}

			at.appendChild(p);
		}
		else
		{
			for (let i = 0; i < elements.length; i++)
			{
				at.appendChild(elements[i]);
			}
		}
	}
	else if (Array.isArray(paragraphs))
	{
		for (let i = 0; i < paragraphs.length; i++)
		{
			address.push(i + 1);

			LoadParagraphs(at, paragraphs[i], toc, headerDepth, address);

			address.pop();
		}
	}
	else
	{
		if (paragraphs.Type === undefined) paragraphs.Type = "text";
		
		if (paragraphs.Type === "text")
		{
			let headerTarget = at;

			if (rootHeaderLink !== undefined)
			{
				headerTarget = CreateLink(rootHeaderLink);
				at.appendChild(headerTarget);
			}

			let header = {};
			if (paragraphs.Header !== undefined)
			{
				header = document.createElement(`h${headerDepth}`);
				header.id = RemoveCamelSpaces(paragraphs.Header);
				header.innerText = paragraphs.Header;
				headerTarget.appendChild(header);
			}

			let subToc = {
				Name: paragraphs.Header,
				ID: header.id,
				Children: []
			};

			LoadParagraphs(at, paragraphs.Sections, subToc, headerDepth + 1, address);

			if (toc !== undefined && toc.Children !== undefined) toc.Children.push(subToc);
		}
		else if (paragraphs.Type === "box")
		{
			let infobox = document.createElement("table");
			infobox.classList.add("box");
			infobox.classList.add("infobox");

			let header = document.createElement("caption");
			header.className = "box_heading";
			header.innerText = paragraphs.Header;
			infobox.appendChild(header);

			let innerBox = document.createElement("tbody");
			infobox.appendChild(innerBox);

			for (let i = 0; i < paragraphs.Sections.length; i++)
			{
				let section = paragraphs.Sections[i];
				let row = document.createElement("tr");
				
				if (section.Header !== undefined)
				{
					let key = document.createElement("th");
					key.className = "box_row_label";
					key.innerText = section.Header;
					key.scope = "row";
					row.appendChild(key);
				}
				
				let value = document.createElement("td");
				value.className = "box_row_value";
				value.colSpan = (section.Header === undefined) ? 2 : 1;

				if (section.Sections === undefined)
				{
					LoadParagraphs(value, section, toc, headerDepth, address, false);
				}
				else
				{
					LoadParagraphs(value, section.Sections, toc, headerDepth, address, false);
				}
				row.appendChild(value);

				innerBox.appendChild(row);
			}

			at.appendChild(infobox);
		}
	}
}

function LoadTOC(toc, headers, depth=0)
{
	for (let i = 0; i < headers.Children.length; i++)
	{
		if (wikipage.content.MaxHeadingDepth === undefined || depth < wikipage.content.MaxHeadingDepth)
		{
			let header = document.createElement("li");
			header.appendChild(CreateLink(`#${RemoveCamelSpaces(headers.Children[i].Name)}`, headers.Children[i].Name));
			toc.appendChild(header);

			let subHeaders = document.createElement("ol");
			LoadTOC(subHeaders, headers.Children[i], depth + 1);
			toc.appendChild(subHeaders);
		}
	}
}

function TreeToJSON(tree)
{
	if (tree === undefined) tree = wikipage.content;

	return JSON.stringify(tree);
}

function TreeToText(tree, depth=0)
{
	if (tree === undefined && depth === 0) tree = wikipage.content;

	let result = "";

	if (typeof tree === "string")
	{
		result = tree + "\n";
	}
	else if (Array.isArray(tree))
	{
		for (let i = 0; i < tree.length; i++)
		{
			result += TreeToText(tree[i], depth);
		}
	}
	else
	{
		if (depth === 0 && tree.Description !== undefined) result += TreeToText(tree.Description, depth + 1) + "\n";
		
		if (tree.Header !== undefined)
		{
			let headerPrefix = "";
			for (let i = 0; i < depth; i++) headerPrefix += "#";
			result += `${headerPrefix} ${tree.Header}\n`;
		}

		for (const [key, value] of Object.entries(tree))
		{
			if (key !== "Header" && key !== "Sections" && (depth !== 0 || key !== "Description"))
			{
				result += `@${key} ${value}\n`;
			}
		}
		
		if (tree.Sections !== undefined) result += TreeToText(tree.Sections, depth + 1);
	}

	return result;
}

function BuildTextTree(text, depth=0)
{
	let result = { Sections: [] };
	let elements = (depth === 0 ? [] : result.Sections);

	if (!Array.isArray(text)) text = text.split("\n");

	while (text.length > 0)
	{
		let line = text.shift().trim();

		if (line.length === 0) continue;

		let headerDepth = line.match(/^\#*/)[0].length;
		let pragmaMatch = line.match(/^@(\w+)\s+(\w+)$/);

		if (pragmaMatch !== null)
		{
			let key = pragmaMatch[1].toUpperCase();
			if (key.length > 1) key = key.charAt(0) + key.slice(1).toLowerCase();

			result[key] = pragmaMatch[2];
		}
		else if (headerDepth > depth)
		{
			let childHeader = line.substr(headerDepth + 1, line.length - (headerDepth + 1));
			let childSection = BuildTextTree(text, depth + 1);
			childSection.Header = childHeader;
			result.Sections.push(childSection);
		}
		else if (headerDepth > 0 && headerDepth <= depth)
		{
			text.unshift(line);
			if (result.Sections.length === 1) result.Sections = result.Sections[0];
			return result;
		}
		else
		{
			elements.push(line);
		}
	}

	if (result.Sections.length === 1) result.Sections = result.Sections[0];

	if (depth === 0)
	{
		result.Description = elements;
	}

	return result;
}

function LoadPageObject(at, content)
{
	wikipage.content = content;

	if (new URLSearchParams(window.location.search).get("viewsource") === "true")
	{
		at.innerText = TreeToText(content);
	}
	else
	{
		let mainHeading = document.createElement("h1");
		mainHeading.className = "main_heading"
		mainHeading.innerText = wikipage.title;
		at.appendChild(mainHeading);

		LoadParagraphs(at, content.Description, 3);

		let toc = document.createElement("ol");
		toc.className = "box";
		at.appendChild(toc);

		let headers = { Children: [] };
		LoadParagraphs(at, content.Sections, headers, 2);

		if (headers.Children.length === 0)
		{
			at.removeChild(toc);
		}
		else
		{
			let tocTitle = document.createElement("p");
			tocTitle.className = "box_title";
			tocTitle.innerText = "Contents";
			toc.appendChild(tocTitle);
			LoadTOC(toc, headers);
		}

		document.dispatchEvent(onWikiLoaded);
	}
}

function LoadContent(at)
{
	let container = document.createElement("div");
	container.className = "container";

	let sidebar = document.createElement("div");
	sidebar.className = "sidebar";

	let article = document.createElement("div");
	article.className = "article";

	let logo = document.createElement("a");
	logo.className = "logo";
	logo.href = WikiPath + "/wiki";
	logo.style.backgroundImage = "url(" + WikiPath + "/styles/logo.png)";

	let footer = document.createElement("div");
	footer.className = "footer";

	let viewSourceLink = document.createElement("a");
	viewSourceLink.innerText = "View Source";
	viewSourceLink.href = "./?viewsource=true";

	footer.appendChild(viewSourceLink);
	sidebar.appendChild(logo);
	container.appendChild(sidebar);
	container.appendChild(article);
	container.appendChild(footer);
	at.appendChild(container);
	at = article;

	RequestSidebar(function(sidebarContent)
	{
		if (sidebarContent.Description !== undefined)
		{
			sidebarContent.Sections = sidebarContent.Description;
			sidebarContent.Description = undefined;
		}

		if (sidebarContent.Sections !== undefined)
		{
			sidebarContent = sidebarContent.Sections;
		}

		LoadParagraphs(sidebar, sidebarContent, undefined, undefined, undefined, false);
	}, function(code)
	{
		sidebar.innerText = `An error occured while loading the sidebar. (${code})`
	});

	RequestContent(function(content)
	{
		LoadPageObject(at, content);
	},
	function(code)
	{
		at.innerText = `An error occured while loading the page. (${code})`
	});
}

function Load()
{
	LoadPath();
	LoadTitle();
	LoadIcon();
	LoadStyles();
	LoadContent(document.body);
}

document.addEventListener("DOMContentLoaded", function()
{
	wikipage = {};
	Load();
});