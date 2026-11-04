# Music player
Static HTML/CSS/JS application; music.js uses the existing createWindow manager. No build or backend added.

Apple Music uses official MusicKit JS v3, loaded only on Connect. Set window.APP_CONFIG.APPLE_MUSIC_DEVELOPER_TOKEN to a valid signed developer JWT before connecting. Generate/rotate it with Apple Developer credentials on trusted infrastructure; NEVER publish the .p8 private key. Authorization is performed by MusicKit. Full playback requires an eligible Apple Music subscription, supported browser/DRM, region and catalog availability. Serve over HTTPS. No user tokens are stored by this module. Enter a catalog song ID to create a queue. Live authorization/playback remains to be validated with real credentials.

Yandex uses the official track iframe only. Paste an HTTPS music.yandex.ru/album/ID/track/ID link. Authentication, playback availability and controls belong to that widget. No undocumented OAuth, stream extraction or cross-origin iframe control is implemented. Click Wheel controls Apple Music only; MENU focuses the service selector. Volume is an explicit slider.

Closing pauses Apple playback and removes the Yandex iframe; minimizing preserves playback.

Sources:
- https://js-cdn.music.apple.com/musickit/v3/docs/
- https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens
- https://yandex.ru/support/wiki/en/actions/iframe

Manual checks: open/reopen/minimize/close; missing developer token; invalid song ID/link; keyboard focus; narrow viewport; iframe availability; real Apple authorization cancellation, playback/pause/skip and volume.
