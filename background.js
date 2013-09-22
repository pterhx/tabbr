tabs = {};
ALCHEMY_URL = 'http://access.alchemyapi.com/calls/url';
ALCHEMY_KEYWORD_URL = ALCHEMY_URL + '/URLGetRankedKeywords';
ALCHEMY_ENTITY_URL = ALCHEMY_URL + '/URLGetRankedNamedEntities';
ALCHEMY_API_KEY = 'cfe3e0f5518dbaee05220655cbc703b4763ccfe9';

prefixMap = {};

var addPrefix = function(prefix, url) {
  if (!prefixMap[prefix]) {
    prefixMap[prefix] = {};
  }
  countMap = prefixMap[prefix];
  if (!countMap[url]) {
    countMap[url] = 1;
  } else {
    countMap[url] += 1;
  }
};

var gtThree = function(str) {
  return str.length > 3;
};

var tokenize = function(tab) {
  var tokens = tab.title.split(' ').filter(gtThree);
  var regex = /:\/\/(.[^/]+)/
  var hostTokens = tab.url.match(regex)[1].split('.').filter(gtThree);
  hostTokens.pop();
  tokens = tokens.concat(hostTokens);
  return tokens;
};

var createDatum = function(tab) {
  return {
    value: tab.title,
    tokens: tokenize(tab),
    favIconUrl: tab.favIconUrl,
    id: tab.id
  }
};

var getDatums = function() {
  datums = []
  for(tabId in tabs) {
    datums.push(tabs[tabId]);
  }
  return datums;
};

var addKeywords = function(tab) {
  $.get(ALCHEMY_KEYWORD_URL + '?url=' + tab.url + '&apikey=' + ALCHEMY_API_KEY +
        '&outputMode=json',
    function(data) {
      datum = tabs[tab.id];
      if (typeof datum === "undefined" || typeof data.keywords === "undefined") {
        debugger
        return;
      }
      data.keywords.forEach(function(keyword) {
        if (parseFloat(keyword.relevance) > 0.8) {
          console.log(keyword.text);
          datum.tokens = datum.tokens.concat(keyword.text.split(' '));
        }
      });
    });
  $.get(ALCHEMY_ENTITY_URL + '?url=' + tab.url + '&apikey=' + ALCHEMY_API_KEY +
        '&outputMode=json',
    function(data) {
      datum = tabs[tab.id];
      if (!data.entities) {
        return;
      }
      data.entities.forEach(function(entity) {
        if (parseFloat(entity.relevance) > 0.8) {
          datum.tokens = datum.tokens.concat(entity.text.split(' '));
        }
      });
    });
}

var onTabCreated = function(tab) {
  tabs[tab.id] = createDatum(tab);
  tabs[tab.id].lastAccessTime = new Date();
  addKeywords(tab);
};

var onTabUpdated = function(tabId, changeInfo, tab) {
  tabs[tabId] = createDatum(tab);
  addKeywords(tab);
};

var onTabRemoved = function(tabId, removeInfo) {
  delete tabs[tabId];
};

var onTabActivated = function(activeInfo) {
  var tabId = activeInfo.tabId,
      windowId = activeInfo.windowId;
  if (typeof this.timeoutCallback === "undefined") {
    this.timeoutCallback = null;
    this.tabInWindow = {};
  }
  if (this.timeoutCallback != null) {
    window.clearTimeout(this.timeoutCallback);
  }
  this.timeoutCallback = window.setTimeout(function() {
    if (typeof this.tabInWindow[windowId] !== "undefined") {
      tabs[this.tabInWindow[windowId]].lastAccessTime = new Date();
      tabs[this.tabInWindow[windowId]].active = false;
    }
    tabs[tabId].lastAccessTime = new Date();
    tabs[tabId].active = true;
    this.tabInWindow[windowId] = tabId;
  }, 1000);
}

var getDatumsByTime = function(after, before) {
  datums = []
  for(var tabId in tabs) {
    if (after < tabs[tabId].lastAccessTime && tabs[tabId].lastAccessTime < before) {
      datums.push(tabs[tabId]);
    }
  }
  return datums;
};

var onMessage = function(request, sender, sendResponse) {
  switch (request.cmd) {
  case 'getDatums':
    sendResponse({datums: getDatums()});
    break;
  case 'addPrefix':
    str = request.prefix;
    while(str !== "") {
      addPrefix(prefix, request.url);
      str = str.slice(0, -1);
    }
    break;
  }
};

var init = function() {
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(onTabCreated);
  });
  chrome.tabs.onCreated.addListener(onTabCreated);
  chrome.tabs.onUpdated.addListener(onTabUpdated);
  chrome.tabs.onRemoved.addListener(onTabRemoved);
  chrome.tabs.onActivated.addListener(onTabActivated);
  chrome.runtime.onMessage.addListener(onMessage);
};

init();
