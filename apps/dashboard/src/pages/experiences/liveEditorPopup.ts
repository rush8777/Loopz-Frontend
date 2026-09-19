export const LIVE_EDITOR_WINDOW_NAME = "movecues-live-editor";
const POPUP_MAX_WIDTH = 1200;
const POPUP_MAX_HEIGHT = 640;
const POPUP_SCREEN_MARGIN = 120;

export function openLiveEditorPopup(): Window | null {
  const width = Math.min(POPUP_MAX_WIDTH, window.screen.availWidth - POPUP_SCREEN_MARGIN);
  const height = Math.min(POPUP_MAX_HEIGHT, window.screen.availHeight - POPUP_SCREEN_MARGIN);
  const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
  return window.open("about:blank", LIVE_EDITOR_WINDOW_NAME, [
    "popup=yes",
    "resizable=yes",
    "scrollbars=yes",
    "toolbar=no",
    "menubar=no",
    "location=no",
    "status=no",
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
  ].join(","));
}
