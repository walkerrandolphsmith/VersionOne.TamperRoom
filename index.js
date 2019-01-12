// ==UserScript==
// @name         VersionOne TeamRoom
// @namespace    http://tampermonkey.net/walkerrandolphsmith
// @version      0.1
// @description  Make your TeamRoom better
// @author       Walker Randolph Smith
// @match        https://www7.v1host.com/V1Production/TeamRoom.mvc/Show/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/arrive/2.4.1/arrive.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/axios/0.18.0/axios.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.0/clipboard.min.js
// ==/UserScript==
(function() {
  "use strict";

  $.ajax(
    "https://raw.githubusercontent.com/walkerrandolphsmith/versionone-teamroom-theme/master/index.css"
  ).done(r => GM_addStyle(r));

  const config = {
    versionOne: {
      url: "V1Production"
    },
    continuum: {
      url: "http://continuum.versionone.co:8080",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "token XXXX"
      }
    },
    keyCodeByActionType: {
      showBoardView: 49,
      showListView: 50
    }
  };

  var selectors = {
    board: ".KanbanBoard",
    column: "td.row-cell",
    columnHeader: ".KanbanBoard .rollup-status",
    swimlane: ".group-by-header",
    card: ".story-card-container",
    sidepanelTabs: ".side-panel .tabs"
  };

  function initializeCopyToClipboard() {
    $(selectors.card + " .number").on("click", function(event) {
      var clipboard = new ClipboardJS(event.currentTarget);

      clipboard.on("success", function(e) {
        e.clearSelection();
      });

      clipboard.on("error", function(e) {});
    });
  }

  function initializeCustomIcons() {
    const paperIcon =
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Computer_icon_for_Dropbox_Paper_app.png/480px-Computer_icon_for_Dropbox_Paper_app.png";
    const story = $(this);
    const numberEl = story.find(".number");
    const number = numberEl.text().trim();
    axios
      .post(`/${config.versionOne.url}/query.v1`, {
        from: "Workitem",
        where: {
          Number: number
        },
        select: [
          "Super.Name",
          {
            from: "Super.Attachments",
            where: {
              Name: "Avatar"
            },
            select: ["Filename"]
          },
          {
            from: "Super.Links",
            where: {
              Name: "Paper Doc"
            },
            select: ["URL"]
          }
        ]
      })
      .then(function(response) {
        const resp = response.data[0][0];
        let superName = resp["Super.Name"];
        let img = "";
        let dblink = "";
        let paperUrl;
        try {
          const avatar = resp["Super.Attachments"][0];
          const attachmentId = avatar._oid.substring("Attachment:".length);
          const filename = avatar.Filename;
          var url = `/${
            config.versionOne.url
          }/attachment.img/${attachmentId}/${filename}`;
          img = `<img src='${url}' />`;
        } catch (e) {}
        try {
          const link = resp["Super.Links"][0];
          paperUrl = link.URL;
        } catch (e) {}
        var paperLink = paperUrl
          ? `<a href='${paperUrl}' target='_blank'><img src='${paperIcon}' /></a>`
          : "";
        story.append(`<div class="more-links">${img}${paperLink}</div>`);
      })
      .catch(function(error) {
        console.log(error);
      });
  }

  function initializeCollapsableColumns() {
    const $headers = $(selectors.columnHeader);
    const isCollapsedByIndex = {};
    $headers.each((index, columnHeader) => {
      var $columnHeader = $(columnHeader);
      isCollapsedByIndex[index] = false;
      $columnHeader.on("click", function() {
        const nextState = !isCollapsedByIndex[index];
        isCollapsedByIndex[index] = nextState;

        var expandedCount = Object.keys(isCollapsedByIndex).reduce(
          (acc, next) => {
            return acc + (next ? 1 : 0);
          },
          0
        );

        var collapsedCount =
          Object.keys(isCollapsedByIndex).length - expandedCount;

        var collapsedColumnPercentage = 2;
        var remainingPrecentage =
          100 - collapsedCount * collapsedColumnPercentage;

        var newWidthPercentage = remainingPrecentage / expandedCount;

        $(`.taskboard .row-cell:nth-child(${index + 1}) *`).css(
          "opacity",
          nextState ? 0 : 1
        );

        $(".taskboard colgroup col").each((jndex, col) => {
          var $col = $(col);
          $col.width(
            isCollapsedByIndex[jndex]
              ? `${collapsedColumnPercentage}%`
              : `${newWidthPercentage}%`
          );
        });
      });
    });
  }

  function initializeCollapsableSwimlanes() {
    var $swimlanes = $(selectors.swimlane);

    var isCollapsedByIndex = {};
    $swimlanes.each((index, element) => {
      var $swimlaneHeader = $(element);
      isCollapsedByIndex[index] = false;

      $swimlaneHeader.on("click", function(event) {
        var $swimlane = $swimlaneHeader.next();

        var nextState = !isCollapsedByIndex[index];
        isCollapsedByIndex[index] = nextState;

        $swimlane.children().css("display", nextState ? "none" : "table-cell");
      });
    });
  }

  function initializeTestView() {
    var typeAttr = "_v1_type";
    var rankAttr = "_v1_rank";
    var oidAttr = "_v1_asset";

    var $cards = $(selectors.card);

    var cards = [];

    $cards.each((index, card) => {
      var $card = $(card);
      var type = $card.attr(typeAttr);
      var rank = $card.attr(rankAttr);
      var oid = $card.attr(oidAttr);
      var title = $card.find(".title").html();
      var number = $card.find(".number").html();

      cards.push({
        type: type,
        rank: rank,
        oid: oid,
        title: title,
        number: number
      });
    });

    var sortedCards = cards.sort((prev, next) => prev.rank > next.rank);

    var lis = sortedCards.reduce((acc, next) => {
      return (
        acc +
        `<div class="list-view-item flex-row">
<div class="icon ${next.type}"></div>
  <div class="flex-column">
    <div>
     <span class="number">${next.oid}</span>
     <span class="number">${next.number}</span>
    </div>
  <div>${next.title}</div>
</div>
</div>`
      );
    }, "");

    $(document.body).append(`<div class="list-view hidden">${lis}</div>`);

    var $listView = $(".list-view");

    var ignoredTargets = ["INPUT", "TEXTAREA"];

    $(document).on("keypress", function(event) {
      var isInlineEdit = $(event.target.parentElement).hasClass(
        "inline-edit-content"
      );
      var isIgnored = Boolean(
        ignoredTargets.find(target => target === event.target.nodeName)
      );
      if (!isInlineEdit && !isIgnored) {
        if (event.keyCode === config.keyCodeByActionType.showBoardView) {
          $listView.addClass("hidden");
        }
        if (event.keyCode === config.keyCodeByActionType.showListView) {
          $listView.removeClass("hidden");
        }
      }
    });
  }

  function intializeBuildStream() {
    var titleSelector = ".asset-summary .toolbar .title-id h2";
    var tabsSelector = ".asset-summary .side-panel .tabs";
    var tabContentSelector =
      ".asset-summary .side-panel .tab-content-container";

    var buildStreamTab =
      '<a class="tab sp-buildstream" title="Build Stream" data-for-tab-content="_buildstream" data-tab-type="build-stream"></a>';

    var assetNumber = $(titleSelector)
      .html()
      .split(" ")[1]
      .trim();

    var buildStreamUrl =
      config.continuum.url + "/api/build_stream?number=" + assetNumber;

    function handleResponse(response) {
      var raw = JSON.parse(response.responseText);
      var builds = raw.Response.map(function(build) {
        var instanceId = build.initiated_by.pi_id;
        return {
          id: instanceId,
          href: config.continuum.url + "/flow/pi_detail?id=" + instanceId,
          status: build.status
        };
      }).filter(function(build) {
        return Boolean(build.id);
      });

      var buildStreamContent = builds.reduce(function(acc, next) {
        return (
          acc +
          '<div class="' +
          next.status +
          '"><a target="_blank" href="' +
          next.href +
          '">' +
          next.href +
          "</a></div>"
        );
      }, "");

      var tabContent =
        '<div id="_buildstream" class="tab-content">' +
        buildStreamContent +
        "</div>";

      $(tabsSelector).append(buildStreamTab);
      $(tabContentSelector).append(tabContent);
    }

    function handleError(error) {
      console.error(error);
      console.error(error.config);
      console.error(error.stack);
    }

    GM_xmlhttpRequest({
      url: buildStreamUrl,
      method: "GET",
      headers: config.continuum.headers,
      onload: handleResponse,
      onerror: handleError,
      synchronous: true
    });
  }

  $(document).arrive(selectors.card, initializeCopyToClipboard);
  $(document).arrive(selectors.card, initializeCustomIcons);
  $(document).arrive(selectors.sidepanelTabs, intializeBuildStream);
  $(document).arrive(selectors.board, initializeTestView);
  $(document).arrive(selectors.swimlanes, initializeCollapsableSwimlanes);
  $(document).arrive(selectors.columnHeader, initializeCollapsableColumns);
})();
