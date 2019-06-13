(function(root, factory) {
  if (typeof module === "object" && module.exports) {
    // Node/CommonJS
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory);
  } else {
    // Browser globals
    root.tamperRoom = factory();
  }
})(this, function factory() {
  // public API
  return {
    run: run
  };
});

function run(GM_xmlhttpRequest, GM_addStyle, secrets) {
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
        Authorization: secrets.continuum
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
        story
          .find(".story-card")
          .append(`<div class="more-links">${img}${paperLink}</div>`);
      })
      .catch(function(error) {
        console.log(error);
      });
  }

  function initializeCollapsibleColumns() {
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

  function initializeCollapsibleSwimlanes() {
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
        var summary = Object.values(build.summary) || {};
        var deploymentSummary = summary.find(item => item.label.startsWith('Instance')) || {value: ''}
        var deploymentUrl = deploymentSummary.value
        return {
            id: instanceId,
            href: config.continuum.url + "/flow/pi_detail?id=" + instanceId,
            deploymentUrl: deploymentUrl,
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
          "</a><br/>" + next.deploymentUrl + "</div>"
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

  /*
    Invert collapsed cards so that you can speak to only the items that folks talked about in stand-up
  */
  function initializeCollapsibleCardsToggleInvert() {
    const invertCollapsedCards = $('<button>Invert collapsed cards</button>');
    invertCollapsedCards.on('click', function () {
      $('.card-toggle').click();
    });
    
    $(selectors.board)
      .parent()
      .prepend(invertCollapsedCards);
  }
  
  function initializeCollapsibleCards() {
    const story = $(this);
    const aging = story.find(".aging");
    const toggleDetails = $('<input type="checkbox" class="card-toggle" />');
    toggleDetails.on("change", () =>
      story.find(".title, .bottom-content").toggle()
    );
    toggleDetails.insertBefore(aging);
  }

  GM_xmlhttpRequest({
    url:
      "https://raw.githubusercontent.com/walkerrandolphsmith/versionone-teamroom-theme/master/index.css",
    method: "GET",
    onload: response => GM_addStyle(response.responseText),
    synchronous: true,
    overrideMimeType: "text/html"
  });

  $(document).arrive(selectors.card, initializeCopyToClipboard);
  $(document).arrive(selectors.card, initializeCardAging);
  $(document).arrive(selectors.card, initializeCustomIcons);
  $(document).arrive(selectors.card, initializeCollapsibleCards);
  $(document).arrive(selectors.sidepanelTabs, intializeBuildStream);
  $(document).arrive(selectors.board, initializeListView);
  $(document).arrive(selectors.swimlanes, initializeCollapsibleSwimlanes);
  $(document).arrive(selectors.columnHeader, initializeCollapsibleColumns);
  $(document).arrive(selectors.board, initalizeMilestoneBanner);
  $(document).arrive(selectors.board, initializeCollapsibleCardsToggleInvert);  
}
