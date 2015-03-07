'use strict';

var tabs = {};
var tabInWindow = {};
var lastActiveTabId = 0;

var addPrefix = function(prefix, tabId) {
  var tab = tabs[tabId];
  if (typeof tab === 'undefined') {
    return;
  }
  var prefixMap = tab['prefixMap'];
  if (!prefixMap[prefix]) {
    prefixMap[prefix] = 1;
  } else {
    prefixMap[prefix] += 1;
  }
};

var gtThree = function(str) {
  return str.length > 3;
};

var getTitleToken = function(term) {
  return {
    term: term,
    weight: 1
  };
};

var tokenize = function(tab) {
  var terms = tab.title.split(' ').filter(gtThree);
  var regex = /:\/\/(.[^/]+)/;
  var hostTerms = tab.url.match(regex);
  // TODO: Handle case when URL is empty.
  if (hostTerms !== null) {
    hostTerms = hostTerms[1].split('.').filter(gtThree);
    terms = terms.concat(hostTerms);
  }
  var tokens = terms.map(getTitleToken);
  if (tokens.length > 0) {
    tokens[0].weight = 1.5;
  }
  return tokens;
};

var createDatum = function(tab) {
  return {
    title: tab.title,
    windowId: tab.windowId,
    tokens: tokenize(tab),
    favIconUrl: tab.favIconUrl,
    id: tab.id,
    prefixMap: {}
  };
};

var getDatums = function() {
  var datums = [];
  for (var tabId in tabs) {
    if (tabs[tabId].id !== lastActiveTabId) {
      datums.push(tabs[tabId]);
    }
  }
  return datums;
};

var addKeywords = function(tab) {
  chrome.tabs.sendMessage(tab.id, {}, function(response) {
    var datum = tabs[tab.id];
    if (typeof datum === 'undefined' || typeof response === 'undefined') {
      return;
    }
    var terms = glossary.extract(response.text);

    var tokens = _.map(terms, function(term) {
      var weight = Math.min(term.count / 10, 0.7);
      return {
        term: term.word.toLowerCase(),
        weight: weight
      };
    });

    datum.tokens = datum.tokens.concat(tokens);
  });
};

var onTabCreated = function(tab) {
  tabs[tab.id] = createDatum(tab);
  tabs[tab.id].lastAccessTime = (new Date()).getTime();
  if (tab.status === 'complete') {
    addKeywords(tab);
  }
};

var reloadTab = function(tabId) {
  chrome.tabs.get(tabId, function(tab) {
    tabs[tab.id] = createDatum(tab);
    if (tab.status !== 'complete') {
      reloadTab(tab.id);
    }
  });
};

var onTabUpdated = function(tabId, changeInfo, tab) {
  tabs[tabId] = createDatum(tab);
  if (changeInfo.status === 'complete') {
    addKeywords(tab);
  } else {
    reloadTab(tabId);
  }
};

var onTabRemoved = function(tabId, removeInfo) {
  delete tabs[tabId];
  delete tabInWindow[removeInfo.windowId];
};

var onTabActivated = function(activeInfo) {
  var tabId = activeInfo.tabId,
      windowId = activeInfo.windowId;
  lastActiveTabId = tabId;
  if (typeof tabs[tabId] === 'undefined') {
    return;
  }
  reloadTab(tabId);
  if (typeof tabInWindow[windowId] !== 'undefined') {
    tabs[tabInWindow[windowId]].lastAccessTime = (new Date()).getTime();
    tabs[tabInWindow[windowId]].active = false;
  }
  tabs[tabId].lastAccessTime = (new Date()).getTime();
  tabs[tabId].active = true;
  tabInWindow[windowId] = tabId;
  chrome.tabs.captureVisibleTab(
    windowId,
    {
      format: 'jpeg',
      quality: 1
    }, function(url) {
    if (typeof tabs[tabId] !== 'undefined') {
      tabs[tabId].previewUrl = url;
    }
  });
};

var onTabReplaced = function(addedTabId, removedTabId) {
  tabs[addedTabId] = tabs[removedTabId];
  delete tabs[removedTabId];
  for (var windowId in tabInWindow) {
    if (tabInWindow[windowId] === removedTabId) {
      tabInWindow[windowId] = addedTabId;
    }
  }
  if (lastActiveTabId === removedTabId) {
    lastActiveTabId = addedTabId;
  }
};

var onMessage = function(request, sender, sendResponse) {
  switch (request.cmd) {
  case 'getDatums':
    sendResponse({datums: getDatums()});
    break;
  case 'addPrefix':
    var str = request.prefix;
    while(str !== '') {
      addPrefix(str, request.tabId);
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
  chrome.tabs.onReplaced.addListener(onTabReplaced);
  chrome.tabs.onActivated.addListener(onTabActivated);
  chrome.runtime.onMessage.addListener(onMessage);
};

init();
