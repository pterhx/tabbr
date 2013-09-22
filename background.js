tabs = {};
ALCHEMY_URL = 'http://access.alchemyapi.com/calls/url';
ALCHEMY_KEYWORD_URL = ALCHEMY_URL + '/URLGetRankedKeywords';
ALCHEMY_ENTITY_URL = ALCHEMY_URL + '/URLGetRankedNamedEntities';
ALCHEMY_API_KEY = 'edf537eb526275ff0f5438eacdf3d515203a8378';

var tokenize = function(tab) {
  var tokens = tab.title.split(' ');
  var regex = /:\/\/(.[^/]+)/
  var hostTokens = tab.url.match(regex)[1].split('.');
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
      if (!data.keywords) {
        return;
      }
      data.keywords.forEach(function(keyword) {
        if (parseFloat(keyword.relevance) > 0.6) {
          datum.tokens.push(keyword.text);
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
        if (parseFloat(entity.relevance) > 0.6) {
          datum.tokens.push(entity.text);
          console.log(entity.text);
        }
      });
    });
}

var onTabCreated = function(tab) {
  tabs[tab.id] = createDatum(tab);
  addKeywords(tab);
};

var onTabUpdated = function(tabId, changeInfo, tab) {
  tabs[tabId] = createDatum(tab);
  addKeywords(tab);
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
