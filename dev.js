// ==UserScript==
// @name         VersionOne TeamRoom
// @namespace    http://tampermonkey.net/walkerrandolphsmith
// @version      0.1
// @description  Make your TeamRoom better
// @author       Walker Randolph Smith
// @match        https://www7.v1host.com/V1Production/TeamRoom.mvc/Show/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @require https://cdnjs.cloudflare.com/ajax/libs/arrive/2.4.1/arrive.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/axios/0.18.0/axios.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/jquery.countdown/2.2.0/jquery.countdown.min.js
// ==/UserScript==

(function() {
  "use strict";
  addStyles();
  dev();
})();

function dev() {
  "use strict";

  const config = {
    versionOne: {
      url: "V1Production",
      queryV1: `/V1Production/query.v1`
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
    sidepanelTabs: ".side-panel .tabs",
    stickyHeader: ".taskboard.sticky-header"
  };

  function copy() {
    document.execCommand("copy");
  }

  function initializeCopyToClipboard() {
    $(selectors.card + " .number").on("click", copy);
  }

  function initializeCustomIcons() {
    const paperIcon =
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Computer_icon_for_Dropbox_Paper_app.png/480px-Computer_icon_for_Dropbox_Paper_app.png";
    const story = $(this);
    const numberEl = story.find(".number");
    const number = numberEl.text().trim();
    axios
      .post(config.versionOne.queryV1, {
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

  function initializeListView() {
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

  function initalizeMilestoneBanner() {
    const query = `
              from: Milestone
              select:
              - Name
              - Date
              - Description
              where:
               Scope.Name: VersionOne
              sort:
              - -Date
              page:
               start: 0
               size: 1`;
    try {
      axios.post(config.versionOne.queryV1, query).then(resp => {
        const milestone = resp.data[0][0];
        const desc = milestone.Description;
        const releaseDate = moment(milestone.Date).format("MM/DD/YYYY");
        const releaseInfo = `${desc} ${
          milestone.Name
        }: <span id='release-counter'></span>`;
        if ($(".release-info").length > 0) return;
        $(selectors.board)
          .parent()
          .prepend(
            `<div class='release-info'><span>${releaseInfo}</span></div>`
          );
        $("#release-counter")
          .countdown(releaseDate)
          .on("update.countdown", function(event) {
            var $this = $(this).html(
              event.strftime(
                "" +
                  "<span>%-w</span> week%!w " +
                  "<span>%-d</span> day%!d " +
                  "<span>%H</span> hr " +
                  "<span>%M</span> min " +
                  "<span>%S</span> sec"
              )
            );
          });
      });
    } catch (e) {}
  }

  function initializeCardAging() {
    $(selectors.card).each((index, element) => {
      var $cardContainer = $(element);
      var $card = $cardContainer.find(".story-card");
      var rawText = $cardContainer
        .find(".advisory")
        .text()
        .trim();
      var lines = rawText.split("\n");
      var cycleTimeText = lines[lines.length - 1];
      cycleTimeText = cycleTimeText.replace("Spent ", "");
      var days = parseInt(cycleTimeText);

      const className = (() => {
        if (days > 12) return 3;
        if (days > 5) return 2;
        if (days > 1) return 1;
        else return 0;
      })();

      $card.addClass("aging-pirate");
      $card.addClass(`aging-level-${className}`);
    });
  }

  $(document).arrive(selectors.card, initializeCopyToClipboard);
  $(document).arrive(selectors.card, initializeCardAging);
  $(document).arrive(selectors.card, initializeCustomIcons);
  $(document).arrive(selectors.sidepanelTabs, intializeBuildStream);
  $(document).arrive(selectors.board, initializeListView);
  $(document).arrive(selectors.swimlanes, initializeCollapsableSwimlanes);
  $(document).arrive(selectors.columnHeader, initializeCollapsableColumns);
  $(document).arrive(selectors.board, initalizeMilestoneBanner);
}

function addStyles() {
  GM_addStyle(
    `
  /*
   *
   * Team Room Top Bar(s)
   *
   */
  
  .teamroom #top-bar, /* main navigation */
  .teamroom .scroll, /* Panels */
  .teamroom .caption, /* Storyboard refresh */
  .teamroom .hide-header, /* collapse */
  .teamroom .filter-by-anything, /* filters */
  .teamroom .KanbanBoard .titlebar, /* Highlight owner */
  .teamroom .navigation
  {
      display:none !important;
  }
  
  /* teammebers and charts */
  .teamroom .collapsed-header + .header {
      height: 0;
      overflow: hidden;
  }
  
  /* storyboard position */
  .teamroom .panel-wrapper {
      top: 0 !important;
      margin-left: 42px;
  }
  
  /* sticky header position */
  .teamroom .sticky-group-by-header.position-absolute {
  
  }
  
  /* gap */
  .teamroom .board {
      margin: 0 !important;
  }
  
  /* easy S-1234 select */
  .teamroom .number {
      user-select: all;
      cursor: pointer;
  }
  
  body.ultimate,
  .teamroom table,
  .teamroom .window {
     background-color: #162228 !important;
  }
  
  .teamroom .taskboard table {
      border-spacing: 4px !important;
  }
  /* Column */
  .teamroom .status,
  .rollup-status {
      background: #263238 !important
  }
  
  .rollup-status {
      height: 12px !important;
  }
  
  /* Add icon at bottom of column */
  .teamroom .cell-add {
      background-image: none !important;
  }
  .teamroom .cell-add:before {
      content: '+';
      color: #eceff1;
      font-size: 3rem;
      cursor: pointer;
  }
  
  /* swimlanes */
  .teamroom .sticky-group-by-header {
      border-color: #162228 !important;
  }
  /* swimlanes */
  .teamroom .group-by-header td {
      background-color: #162228 !important;
      border-top-color: #162228 !important;
      color: white !important;
  }
  
  /*
   *
   * Card
   *
   */
  .more-links {
      display: flex;
      align-items: center;
  }
  
  .more-links > *, .more-links img {
      width: 20px;
      height: 20px;
      min-width: 20px;
      min-height: 20px;
      max-width: 20px;
      max-height: 20px;
  }
  
  .more-links > * {
       margin: 5px;
  }
  
  .teamroom .story-card-container {
      margin-bottom: 15px !important;
      position: relative;
  }
  
  .teamroom .story-card {
      border-bottom: none !important;
  }
  
  .teamroom .story-card  + .bottom-card-tab {
  
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      margin: 0 !important;
      padding: 0 !important;
      height: 2px;
  }
  
  .teamroom .story-card + .bottom-card-tab .multibar {
      width: 100%;
      height: 2px;
      border-radius: 0;
      overflow: hidden;
      position: absolute;
      top: 0;
  }
  
  .teamroom .story-card  + .bottom-card-tab img {
      width: 100% !important;
      height: 2px;
      position: absolute;
      top: 0;
  }
  
  .teamroom .story-card .bottom-card-tab,
  .teamroom .group-by-header td,
  .teamroom .story-card .tag-holder a,
  .teamroom .story-card .story-card-actions,
  .teamroom .story-card .aging {
      color: #eceff1 !important;
  }
  
  .teamroom .story-card + .bottom-card-tab {
      background-color: #37474f !important;
      border-bottom: none !important;
      box-shadow: 0 2px 1px -1px rgba(0,0,0,.2), 0 1px 1px 0 rgba(0,0,0,.14), 0 1px 3px 0 rgba(0,0,0,.12) !important;
  }
  
  .teamroom .story-card .identity-right,
  .teamroom .story-card .identity-left .number {
      background-color: #162228 !important;
  }
  
  .teamroom .story-card .identity-left .number:before,
  .teamroom .story-card .identity-right:before {
      border-color: #162228 #162228 transparent transparent !important;
  }
  
  .teamroom .story-card .identity-left .number:after {
       border-color: #162228 transparent transparent #162228 !important;
  }
  
  .teamroom .story-card .tag-holder {
      background-color: #263238 !important;
  }
  /*
   *
   * Details Modal
   *
   */
  
  /* reposition details modal */
  .inline-asset-detail {
      top: 0;
      bottom: 0;
      left: 50px;
      right: 0;
  }
  
  .inline-asset-detail .toolbar {
      height: 0px;
      overflow: hidden;
  }
  
  .inline-asset-edit .toolbar .title-id {
      position: fixed;
      top: 0px;
      left: 76px;
      z-index: 2;
      color: black !important;
  }
  
  .asset-summary .toolbar h2 {
      user-select: all !important;
  }
  
  .asset-summary .toolbar .icon {
      visibility: hidden !important;
  }
  
  .side-panel {
      top: 0 !important;
  }
  
  /* color action dropdon */
  .inline-asset-detail .asset-actions.tab-button {
      padding: 0 !important;
      background-color: #00a9e0 !important;
  }
  
  /* quick action "edit" button */
  .inline-asset-detail .tab-buttons .quick-action-text {
      display: none;
  }
  
  .inline-asset-detail .action-menu-button {
      width: 100%;
      height: 28px;
      display: flex;
      justify-content: center;
      align-items: center;
  }
  
  /* Unwanted fields */
  .inline-asset-detail .custom-fields,
  .inline-asset-detail .layout-left .other-extended-fields,
  .inline-asset-detail .tabbar .tabs {
      display: none !important;
  }
  
  /* open in tab link */
  .inline-asset-detail .pop-out {
      position: fixed;
      bottom: 0;
      left: 50px;
      width: 42px;
      height: 42px;
      margin: 0;
      z-index: 2;
      background-size: auto;
      background-position: center;
      background-color: darkslategrey;
  }
  
  /*Grid*/
  .grid .gridtable [_v1_updater="Test.Name"],
  .grid .gridtable [_v1_updater="Story.Name"],
  .grid .gridtable [_v1_updater="Epic.Name"]
  {
      width: 35em !important;
  }
  
  /* shift board over to show team members */
  .teamroom .window {
     width: calc(100% - 42px) !important;
  }
  
  /* All members filter */
  .teamroom .mascot-wrapper {
       position: fixed;
      left: 4px;
      top: 24px;
      width: 32px !important;
      height: 32px !important;
  }
  
  /* single member filter */
  .teamroom .mascot-wrapper img {
      width: 32px !important;
      height: 32px !important;
  }
  
  .teamroom .persona-filters .owner-list ul {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 42px;
      margin: 0;
      position: fixed;
      top: 64px;
      left: 0;
      bottom: 0;
      z-index: 100;
      overflow: hidden;
  }
  
  .teamroom .persona-filters .owner-list ul:hover {
       overflow: auto !important;
  }
  
  .teamroom .persona-filters .owner-list ul li {
      margin-right: 0 !important;
  }
  
  /* scollbars */
  .teamroom .board {
      height: 100vh !important;
  }
  
  .teamroom .window::-webkit-scrollbar,
  .teamroom .persona-filters .owner-list ul::-webkit-scrollbar {
      width: 4px;
      height: 0;
  }
  
  .teamroom .panel-wrapper::-webkit-scrollbar {
       height: 4px;
  }
  
  .teamroom .panel-wrapper::-webkit-scrollbar-thumb,
  .teamroom .window::-webkit-scrollbar-thumb,
  .teamroom .persona-filters .owner-list ul::-webkit-scrollbar-thumb {
      background-color: #eceff1;
  }
  
  .teamroom .persona-filters .owner-list ul .name {
      display: none !important;
  }
  
  .teamroom .panel-wrapper .panels ol li {
       border: none !important;
  }
  
  
  /*
   * No data state
  */
  .teamroom .no-results {
      color: white;
      background: #162228;
      height: 100vh;
      top: -28px;
      position: absolute;
      right: 0;
      left: 0;
      height: 90vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
  }
  
  
  /**
  
  **/
  .taskboard {
      table-layout: fixed;
  }
  
  .rollup-status {
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      cursor: pointer;
  }
  
  /**
  Toggle between list view and board view
  **/
  
  .list-view {
      width: 100%;
      position: fixed;
      top: 0;
      left: 45px;
      right: 0;
      bottom: 0;
      background: #162228;
      z-index: 9999;
      color: white;
      overflow-y: scroll;
  }
  
  .flex-row {
      display: flex;
      flex-direction: row;
  }
  
  .flex-column {
      display: flex;
      flex-direction: column;
  }
  
  .list-view-item {
      border-bottom: 1px solid white;
  }
  
  .list-view-item .icon {
       width: 32px;
      height: 32px;
      margin: 8px;
      margin-top: 0;
  }
  
  .list-view-item .icon.Story {
      background: green;
  }
  
  .list-view-item .icon.Defect {
      background: red;
  }
  
  .list-view a {
      color: white !important;
  }
  
  .list-view > * {
      padding: 8px;
  }
  
  .list-view .number {
      user-select: all;
      cursor: pointer;
  }
  
  .toggleListView {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 99999999;
      background: green;
      border-radius: 50%;
      width: 30px;
      height: 30px;
  }
  
  #_buildstream > div {
    padding: 8px;
  }
  
  #_buildstream > div.success {
    background: #e3f2e9;
  }
  
  #_buildstream > div.failure {
    background: #e6c6c6;
  }
  
  #_buildstream > div.pending {
    background: blue;
  }
  
  .release-info {
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: space-between;
  }
  .release-info span {
      background-color: yellow;
      padding: 4px;
      border-color: yellow;
      border-radius: 8px;
  }
  
  .aging-pirate {
    background-position: 0 0, 100% 0;
    background-repeat: no-repeat
  }
  
  .aging-pirate.aging-level-0 {
    background-color: white;
  }
  
  .aging-pirate.aging-level-1 {
      background-color: #faf6ef;
      background-image: url(https://a.trellocdn.com/prgb/dist/images/powerups/card-aging/TopLeftLevel1.53102e7b253303f6eb34.png), url(https://a.trellocdn.com/prgb/dist/images/powerups/card-aging/TopRightLevel1.b6830a5537c94f982a32.png);
      box-shadow: inset 0 0 15px hsla(33, 42%, 66%, .4)
  }
  
  .aging-pirate.aging-level-2 {
      background-color: #f6eedf;
      background-image: url(https://a.trellocdn.com/prgb/dist/images/powerups/card-aging/TopLeftLevel2.18f4120762d23b79c07e.png), url(https://a.trellocdn.com/prgb/dist/images/powerups/card-aging/TopRightLevel2.c74a8a1f361b08433f2a.png);
      box-shadow: inset 0 0 25px hsla(33, 42%, 66%, .5)
  }
  
  .aging-pirate.aging-level-3 {
      background-color: #efe1c8;
      background-image: url(https://a.trellocdn.com/prgb/dist/images/powerups/card-aging/TopLeftLevel3.194454130e88f7411187.png), url(https://a.trellocdn.com/prgb/dist/images/powerups/card-aging/TopRightLevel3.8c21cb29b9a909eecc47.png);
      box-shadow: inset 0 0 40px hsla(33, 42%, 66%, .6)
  }
  `
  );
}
