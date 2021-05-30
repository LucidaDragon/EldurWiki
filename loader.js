const onWikiLoaded = new Event("wikiLoaded");

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
	icon.setAttribute("href", "/EldurWiki/styles/icon.png");

	document.head.appendChild(icon);
}

function LoadStyles()
{
	let defaultStyle = document.createElement("link");
	defaultStyle.setAttribute("rel", "stylesheet");
	defaultStyle.setAttribute("href", "/styles/default.css");

	let pageStyle = document.createElement("link");
	pageStyle.setAttribute("rel", "stylesheet");
	pageStyle.setAttribute("href", `/styles/${wikipage.name}.css`);

	document.head.appendChild(defaultStyle);
	document.head.appendChild(pageStyle);
}

function GetRequest(url, onContentReceived, onError)
{
	let request = new XMLHttpRequest();
	request.responseType = "json";
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

function RequestContent(onContentReceived, onError)
{
	GetRequest("./content.json", onContentReceived, onError);
}

function RequestSidebar(onContentReceived, onError)
{
	GetRequest("/EldurWiki/wiki/sidebar.json", onContentReceived, onError);
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
						img.src = `/EldurWiki/images/${name.split(':', 2)[1]}`;
						elements.push(img);
					}
					else if (name.toLowerCase().startsWith("sub:"))
					{
						let subRoot = document.createElement("div");
						let subArticleName = name.split(':', 2)[1];
						elements.push(subRoot);

						GetRequest(`/EldurWiki/wiki/${subArticleName}/content.json`, function(subContent)
						{
							let subArticle = {};
							subArticle.Header = AddCamelSpaces(subArticleName);
							subArticle.Sections = [
								subContent.Description,
								subContent.Sections
							];

							LoadParagraphs(subRoot, subArticle, toc, headerDepth, address, usePTag, `/EldurWiki/wiki/${subArticleName}`);
						},
						function(code)
						{
							subRoot.appendChild(document.createTextNode(`[Could not load sub-article \"${subArticleName}\" (Error ${code})]`));
						});
					}
					else
					{
						elements.push(CreateLink(`/EldurWiki/wiki/${name}`, name));
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

			let header = document.createElement(`h${headerDepth}`);
			header.id = RemoveCamelSpaces(paragraphs.Header);
			header.innerText = paragraphs.Header;
			headerTarget.appendChild(header);

			let subToc = {
				Name: paragraphs.Header,
				ID: header.id,
				Children: []
			};

			LoadParagraphs(at, paragraphs.Sections, subToc, headerDepth + 1, address);

			toc.Children.push(subToc);
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
				LoadParagraphs(value, section.Sections, toc, headerDepth, address, false);
				row.appendChild(value);

				innerBox.appendChild(row);
			}

			at.appendChild(infobox);
		}
	}
}

function LoadTOC(toc, headers, depth)
{
	if (depth === undefined) depth = 0;

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
	logo.href = "/EldurWiki/wiki";

	sidebar.appendChild(logo);
	container.appendChild(sidebar);
	container.appendChild(article);
	at.appendChild(container);
	at = article;

	RequestContent(function(content)
	{
		wikipage.content = content;

		RequestSidebar(function(sidebarContent)
		{
			LoadParagraphs(sidebar, sidebarContent, undefined, undefined, undefined, false);
		}, function(code){});

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