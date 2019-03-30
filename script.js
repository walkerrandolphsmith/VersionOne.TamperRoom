// ==UserScript==
// @name         VersionOne Super Title Always on Cards
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www7.v1host.com/V1Production/TeamRoom.mvc/Show/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/arrive/2.4.1/arrive.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/axios/0.18.0/axios.min.js
// ==/UserScript==
(function() {
    'use strict';
    const v1Instance = 'V1Production';
    const paperIcon = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Computer_icon_for_Dropbox_Paper_app.png/480px-Computer_icon_for_Dropbox_Paper_app.png';
    $(document).arrive(".story-card", function() {
        const story = $(this);
        const numberEl = story.find('.number');
        const number = numberEl.text().trim();
        axios.post(`/${v1Instance}/query.v1`, {
            "from": "Workitem",
            "where": {
                "Number": number
            },
            "select": [
                "Super.Name",
                {
                    "from": "Super.Attachments",
                    "where": {
                        "Name": "Avatar"
                    },
                    "select": [
                        "Filename"
                    ]
                },
                {
                    "from": "Super.Links",
                    "where": {
                        "Name": "Paper Doc"
                    },
                    "select": ["URL"]
                }
            ]
        })
        .then(function (response) {
            const resp = response.data[0][0];
            let superName = resp['Super.Name'];
            let img = '';
            let dblink = '';
            let paperUrl;
            try {
                const avatar = resp['Super.Attachments'][0];
                const attachmentId = avatar._oid.substring("Attachment:".length);
                const filename = avatar.Filename;
                var url = `/${v1Instance}/attachment.img/${attachmentId}/${filename}`;
                img = `<img src='${url}' />`;
            } catch (e) {
            }
            try {
                const link = resp['Super.Links'][0];
                paperUrl = link.URL;
            } catch(e) {
            }
            var paperLink = paperUrl ? `<a href='${paperUrl}' target='_blank'><img src='${paperIcon}' /></a>` : "";
            story.append(`<div class="more-links">${img}${paperLink}</div>`);
        })
        .catch(function (error) {
            console.log(error);
        });
    });

    var columnSelector = 'td.row-cell'
    var columnHeaderSelector = '.KanbanBoard .rollup-status';

    $(document).arrive(columnHeaderSelector, function() {
        const $headers = $(columnHeaderSelector);
        const isCollapsedByIndex = {};
        $headers.each((index, columnHeader) => {
            var $columnHeader = $(columnHeader);
            isCollapsedByIndex[index] = false;
            $columnHeader.on('click', function() {
                const nextState = !isCollapsedByIndex[index];
                isCollapsedByIndex[index] = nextState;

                var expandedCount = Object.keys(isCollapsedByIndex).reduce((acc, next) => {
                   return acc + (next ? 1 : 0)
                }, 0);

                var collapsedCount = Object.keys(isCollapsedByIndex).length - expandedCount;

                var collapsedColumnPercentage = 2;
                var remainingPrecentage = 100 - (collapsedCount * collapsedColumnPercentage);

                var newWidthPercentage = remainingPrecentage/expandedCount;

                $(`.taskboard .row-cell:nth-child(${index + 1}) *`).css('opacity', nextState ? 0 : 1);

                $('.taskboard colgroup col').each((jndex, col) => {
                    var $col = $(col);
                    $col.width(isCollapsedByIndex[jndex] ? `${collapsedColumnPercentage}%` : `${newWidthPercentage}%`)
                });
            });
        });
    });
})();
