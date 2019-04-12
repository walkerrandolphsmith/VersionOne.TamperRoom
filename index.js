// ==UserScript==
// @name         VersionOne TeamRoom
// @namespace    http://tampermonkey.net/walkerrandolphsmith
// @version      0.1
// @description  Make your TeamRoom better
// @author       Walker Randolph Smith
// @match        https://www7.v1host.com/V1Production/TeamRoom.mvc/Show/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==
(function() {
	'use strict';

	var secrets = {
		continuum: 'token XXXXXXXXXXXXX',
	};

	$.ajax(
		'https://raw.githubusercontent.com/walkerrandolphsmith/versionone-teamroom-theme/master/index.css',
	).done(r => GM_addStyle(r));

	function addScript(code) {
		var script = document.createElement('script');
		script.setAttribute('type', 'text/javascript');
		script.appendChild(document.createTextNode(code));
		document.body.appendChild(script);
	}

	var srcs = [
		'https://cdnjs.cloudflare.com/ajax/libs/arrive/2.4.1/arrive.min.js',
		'https://cdnjs.cloudflare.com/ajax/libs/axios/0.18.0/axios.min.js',
		'https://cdnjs.cloudflare.com/ajax/libs/jquery.countdown/2.2.0/jquery.countdown.min.js',
		'https://raw.githubusercontent.com/walkerrandolphsmith/versionone-teamroom-theme/master/contents.js',
	];

	document.body.onload = function() {
		Promise.all(srcs.map(src => $.ajax(src))).then(scripts => {
			scripts.map(script => addScript(script));
			tamperRoom.run(GM_xmlhttpRequest, secrets);
		});
	};
})();
