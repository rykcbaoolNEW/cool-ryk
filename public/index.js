"use strict";
/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("sj-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("sj-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("sj-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("sj-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("sj-error-code");

const { ScramjetController } = $scramjetLoadController();

const sidebar = document.getElementById("sidebar");
const bottomBox = document.getElementById("bottom-box");
const bottomUrl = document.getElementById("bottom-url");

const backBtn = document.getElementById("back-btn");
const reloadBtn = document.getElementById("reload-btn");
const goBtn = document.getElementById("go-btn");

// scramjet starts here

const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});

scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

form.addEventListener("submit", async (event) => {
	event.preventDefault();

	try {
		await registerSW();
	} catch (err) {
		error.textContent = "Failed to register service worker.";
		errorCode.textContent = err.toString();
		throw err;
	}

	function normalize(input) {
		if (!input) return null;

		input = input.trim();

		// Already a full URL
		if (input.startsWith("http://") || input.startsWith("https://")) {
			return input;
		}

		// Looks like a domain (example.com)
		if (input.includes(".") && !input.includes(" ")) {
			return "https://" + input;
		}

		// Otherwise treat as search
		return "https://www.duckduckgo.com/search?q=" + encodeURIComponent(input);
	}

	function isBlocked(url) {
		return (
			url.includes("localhost") ||
			url.includes("127.0.0.1") ||
			url.startsWith(location.origin)
		);
	}

	const url = normalize(address.value);
	if (isBlocked(url)) return;


	let wispUrl =
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" +
		location.host +
		"/wisp/";
	if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
		await connection.setTransport("/libcurl/index.mjs", [
			{ websocket: wispUrl },
		]);
	}
	const frame = scramjet.createFrame();
	frame.frame.id = "sj-frame";
	document.body.appendChild(frame.frame);
	frame.go(url);
	callBottomBox(url);
});

// scramjet end here
// ryk starts here and well

let lastUrl = "";
const historyStack = [];
let historyIndex = -1;
const frame = scramjet.createFrame();
frame.frame.id = "sj-frame";

function navigate(url) {
	const input = document.getElementById("sj-address");
	const form = document.getElementById("sj-form");

	url = url.trim();

	input.value = url;
	form.dispatchEvent(new Event("submit"));

	// if we moved away from current point, remove forward history
	if (historyIndex < historyStack.length - 1) {
		historyStack.splice(historyIndex + 1);
	}

	historyStack.push(url);
	historyIndex = historyStack.length - 1;

	console.log("HISTORY:", historyStack, "INDEX:", historyIndex);
}

function callBottomBox(url) {
	if (!bottomBox) return;

	bottomBox.classList.add("show");
	bottomUrl.value = url;
	lastUrl = url;
}


goBtn.onclick = () => {
	navigate(bottomUrl.value);
};

bottomUrl.addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		navigate(bottomUrl.value);
	}
});

reloadBtn.onclick = () => {
	if (historyIndex < 0) return;

	const url = historyStack[historyIndex];

	document.getElementById("sj-address").value = url;
	document.getElementById("sj-form").dispatchEvent(new Event("submit"));
};

backBtn.onclick = () => {
	if (historyIndex <= 0) return;

	historyIndex--;

	const url = historyStack[historyIndex];

	document.getElementById("sj-address").value = url;
	document.getElementById("sj-form").dispatchEvent(new Event("submit"));

	console.log("BACK TO:", url);
};

document.addEventListener("keydown", (e) => {
	if (e.key === "`") {
		e.preventDefault();
		sidebar.classList.toggle("open");
		// used for testing when I made it,
		// alert("test")
	}
});
