tabs = {};

var tokenize = function(tab) {
  titleTokens = tab.title.split(' ');
  return titleTokens;
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

var onTabCreated = function(tab) {
  tabs[tab.id] = createDatum(tab);
};

var onTabUpdated = function(tabId, changeInfo, tab) {
  tabs[tabId] = createDatum(tab);
};

var onTabRemoved = function(tabId, removeInfo) {
  delete tabs[tabId];
};

var onMessage = function(request, sender, sendResponse) {
  if (request.cmd === 'getDatums') {
    sendResponse({datums: getDatums()});
  }
};

var init = function() {
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(onTabCreated);
  });
  chrome.tabs.onCreated.addListener(onTabCreated);
  chrome.tabs.onUpdated.addListener(onTabUpdated);
  chrome.tabs.onRemoved.addListener(onTabRemoved);
  chrome.runtime.onMessage.addListener(onMessage);
};

init();
