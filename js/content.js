chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    sendResponse({text: document.body.innerText});
    return true;
  });
