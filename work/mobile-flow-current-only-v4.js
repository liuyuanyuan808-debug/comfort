(function () {
  const PROFILE_KEY = "mobileFlowComfortProfileV2";
  const DRAFT_KEY = "mobileFlowComfortDraftV3";
  const PUMPING_HISTORY_KEY = "mobileFlowPumpingHistoryV1";
  const TREND_PROMPT_KEY = "mobileFlowTrendPromptV1";
  const MAX_LEVEL = 9;

  function install(frame) {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win || win.__comfortV4Installed) return;
    win.__comfortV4Installed = true;
    let syncComfortPlaceholder = function () {};
    let syncComfortCards = function () {};
    let comfortBubbleTimer = 0;
    let comfortBubbleDemoTimer = 0;
    let comfortBubbleDismissed = false;
    let lastComfortInteractionAt = 0;
    let selectedRhythm = "Stimulation";
    let expressionGuideDeferred = false;
    let manualExpressionTransition = false;
    let calibrationInviteShownThisSession = false;
    // The base prototype swaps the two comfort nodes during state changes.
    // Keep one stable, dedicated card visible throughout a live session.
    let keepComfortCardVisible = false;

    const surfaceStyle = doc.createElement("style");
    surfaceStyle.id = "comfortSurfaceV4";
    surfaceStyle.textContent = `
      html,body{margin:0!important;background:#fffaf7!important}
      .app-shell{min-height:100svh!important;padding:0!important;background:#fffaf7!important}
      .phone{width:100%!important;max-width:none!important;height:100svh!important;min-height:100svh!important;margin-left:0!important;border-radius:44px!important;background:#fffaf7!important;box-shadow:none!important}
      /* One continuous control surface: no enlarged/cropped reference image and no edge patches. */
      .control-reference-page{--mcv-inner-left:0px!important;--mcv-inner-right:0px!important;--mcv-card-left:6%!important;--mcv-card-right:6%!important;overflow-x:hidden!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;scrollbar-width:none;background:#fbf8f4!important}
      .control-reference-page::-webkit-scrollbar{display:none!important}
      .mcv-inner-surface{position:relative!important;inset:auto!important;min-height:0!important;height:0!important;border-radius:44px!important;overflow:visible!important;background:#fbf8f4!important}
      .control-reference-page .control-reference-image{display:none!important}
      .mcv-native-head-v4{position:relative;z-index:3;height:36svh;overflow:hidden;color:#2d1d24;background:radial-gradient(ellipse 82% 66% at 50% 52%,rgba(255,237,174,.86) 0%,rgba(255,237,174,.52) 34%,rgba(255,229,203,.18) 62%,transparent 76%),linear-gradient(180deg,#f8d7d7 0%,#fce4d5 23%,#fff0c7 48%,#fce8df 71%,#f9f7f5 100%)!important;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",Arial,sans-serif}
      .mcv-native-status-v4{display:none!important}
      .mcv-native-system-v4{display:flex;align-items:center;gap:8px}
      .mcv-native-signal-v4{display:flex;align-items:flex-end;gap:2px;height:14px}.mcv-native-signal-v4 i{display:block;width:3px;border-radius:2px;background:#2d1d24}.mcv-native-signal-v4 i:nth-child(1){height:5px}.mcv-native-signal-v4 i:nth-child(2){height:8px}.mcv-native-signal-v4 i:nth-child(3){height:11px}.mcv-native-signal-v4 i:nth-child(4){height:14px}
      .mcv-native-wifi-v4{position:relative;width:18px;height:13px;border-top:3px solid #2d1d24;border-radius:50%}.mcv-native-wifi-v4::before{content:"";position:absolute;left:4px;top:2px;width:8px;height:7px;border-top:3px solid #2d1d24;border-radius:50%}.mcv-native-wifi-v4::after{content:"";position:absolute;left:7px;top:7px;width:4px;height:4px;border-radius:50%;background:#2d1d24}
      .mcv-native-battery-v4{position:relative;width:24px;height:12px;border:2px solid #2d1d24;border-radius:4px}.mcv-native-battery-v4::before{content:"";position:absolute;inset:2px;border-radius:2px;background:#2d1d24}.mcv-native-battery-v4::after{content:"";position:absolute;right:-4px;top:3px;width:2px;height:4px;border-radius:0 2px 2px 0;background:#2d1d24}
      .mcv-native-nav-v4{position:fixed;z-index:50;top:0;left:0;right:0;height:80px;padding:16px 6% 12px;display:grid;grid-template-columns:48px minmax(0,1fr) 96px;align-items:center;background-color:transparent!important;background-image:none!important;backdrop-filter:none!important}.mcv-native-nav-v4 h2{margin:0;text-align:center;font-size:18px;font-weight:650;letter-spacing:.2px}
      .mcv-native-icon-button-v4{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;color:#2d1d24;background:rgba(255,255,255,.84);box-shadow:0 8px 24px rgba(88,53,63,.06)}.mcv-native-back-v4{font-size:32px;font-weight:300;line-height:1;transform:translateY(-1px)}
      .mcv-native-tools-v4{justify-self:end;display:flex;width:48px;height:48px;align-items:center;justify-content:center;border-radius:26px;background:rgba(255,255,255,.84);box-shadow:0 8px 24px rgba(88,53,63,.06)}.mcv-native-tools-v4 button{display:grid;place-items:center;width:42px;height:42px;color:#2d1d24;background:transparent}.mcv-native-help-v4{font-size:22px;font-weight:700}.mcv-native-gear-v4{font-size:27px;line-height:1}
      .mcv-native-message-canvas-v7{position:absolute;z-index:1;top:82px;left:12%;right:12%;height:54px;border-radius:18px;display:flex;align-items:center;justify-content:center;color:#76585f;font-size:11px;font-weight:600;line-height:1.5;text-align:center;pointer-events:none}.mcv-native-device-v4{position:absolute;z-index:2;left:6%;right:6%;top:140px;bottom:18px;display:grid;grid-template-rows:minmax(0,1fr) 30px;align-items:center;overflow:visible;background:transparent}.mcv-native-pumps-v4{position:relative;z-index:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:center;width:100%;height:100%}.mcv-native-pump-v4{height:auto;aspect-ratio:1/1;align-self:center;background-image:url("../assets/dual-pump-transparent-v4.png");background-repeat:no-repeat;background-size:200% auto;filter:contrast(1.03);transform:scale(.7);transform-origin:center}.mcv-native-pump-v4--left{background-position:left center}.mcv-native-pump-v4--right{background-position:right center}.mcv-native-device-v4::before,.mcv-native-device-v4::after{display:none}.mcv-native-pump-stats-v6{position:relative;z-index:3;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;align-items:end;width:100%;padding:0;color:#743044;text-align:center;background:transparent;transform:translateY(11px)}.mcv-native-pump-stats-v6 span{display:flex;flex-direction:column;gap:2px;align-items:center;justify-self:center;font-size:9px;font-weight:700;line-height:1}.mcv-native-pump-stats-v6 em{font-style:normal;color:#7c3347;font-size:12px;font-weight:800}.mcv-native-pump-stats-v6 small{color:#82747a;font-size:9.5px;font-weight:700}
      .mcv-content-scrim{display:none!important}
      /* Suppress every legacy black/English prototype toast. Purpose-built
         Chinese feedback uses .mcv-comfort-toast-v5 instead. */
      #toast.toast{display:none!important}
      .mcv-log-layer-v1{position:fixed;z-index:150;inset:0;display:flex;align-items:flex-end;background:rgba(54,33,41,.18);animation:mcv-log-fade-v1 .2s ease}.mcv-log-sheet-v1{width:100%;min-height:72%;display:flex;flex-direction:column;padding:24px 22px calc(22px + env(safe-area-inset-bottom,0px));border-radius:42px 42px 0 0;background:#fff8f4;box-shadow:0 -8px 24px rgba(78,27,46,.10);animation:mcv-log-rise-v1 .36s cubic-bezier(.2,.9,.25,1)}.mcv-log-top-v1{position:relative;text-align:center}.mcv-log-close-v1{position:absolute;left:0;top:0;display:grid;place-items:center;width:42px;height:42px;border-radius:50%;color:#432d35;background:#fff;font-size:28px;font-weight:300;box-shadow:0 6px 18px rgba(70,37,48,.08)}.mcv-log-top-v1 h2{margin:5px 0 0;color:#82002b;font-family:"Snell Roundhand","Segoe Script","Bradley Hand",cursive;font-size:34px;line-height:1.1;font-weight:700}.mcv-log-date-v1{display:block;margin-top:8px;color:#9a8e93;font-size:12px;font-weight:650}.mcv-log-amounts-v1{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin:26px 4px 22px}.mcv-log-side-v1{display:grid;justify-items:center;gap:10px}.mcv-log-cup-v1{display:grid;place-items:center;width:112px;height:112px;border-radius:50%;color:#fff;background:radial-gradient(circle at 48% 24%,rgba(255,255,255,.38),transparent 25%),linear-gradient(145deg,#ffb0bc,#ff829a);font-family:Georgia,serif;font-size:35px;text-shadow:0 2px 8px rgba(135,30,57,.16)}.mcv-log-step-v1{display:flex;align-items:center;justify-content:center;gap:12px;width:144px;height:46px;border-radius:999px;background:#fff;box-shadow:0 7px 18px rgba(80,43,54,.08)}.mcv-log-step-v1 button{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;color:#8d002b;background:#fce7ec;font-size:22px;line-height:1}.mcv-log-step-v1 strong{min-width:47px;color:#554149;font-size:18px;text-align:center}.mcv-log-step-v1 small{margin-left:-8px;color:#9d9296;font-size:11px}.mcv-log-duration-v1{display:flex;align-items:center;justify-content:space-between;min-height:58px;margin:0 4px;padding:0 18px;border:1px solid rgba(139,91,105,.12);border-radius:22px;background:#fff;box-shadow:0 6px 16px rgba(80,43,54,.06)}.mcv-log-duration-v1 strong{color:#34252b;font-size:15px}.mcv-log-duration-v1 span{color:#9d9296;font-size:13px}.mcv-log-save-v1{width:calc(100% - 8px);height:56px;margin:20px 4px 0;border-radius:999px;color:#fff;background:linear-gradient(120deg,#97032d,#ca5270);font-size:16px;font-weight:800;box-shadow:0 10px 22px rgba(123,0,38,.15)}.mcv-log-save-v1:disabled{color:#fff;background:#dbadb8;box-shadow:none}@keyframes mcv-log-rise-v1{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}@keyframes mcv-log-fade-v1{from{opacity:0}to{opacity:1}}
      .mcv-log-layer-v1{display:block!important;background:rgba(54,33,41,.18)!important}.mcv-log-layer-v1:after{content:"";position:absolute;z-index:2;left:0;right:0;bottom:0;height:5.5%;background:#fff8f4;pointer-events:none}.mcv-log-reference-v1{position:absolute;left:0;right:0;bottom:0;display:block;width:100%;height:72.8%;object-fit:cover;object-position:bottom;border-radius:42px 42px 0 0}.mcv-log-zero-reference-v1{position:absolute;z-index:4;left:0;right:0;top:45%;display:block;width:100%;height:auto}.mcv-log-reference-action-v1{position:absolute;z-index:3;padding:0;background:transparent}.mcv-log-reference-close-v1{left:4%;top:29%;width:13%;height:8%}.mcv-log-reference-trash-v1{right:4%;top:29%;width:13%;height:8%}.mcv-log-reference-save-v1{left:7%;right:7%;bottom:5.5%;height:7%}.mcv-log-drag-v1{position:absolute;z-index:5;top:50%;width:37%;height:20%;overflow:hidden;border-radius:50%;touch-action:none;cursor:ns-resize}.mcv-log-drag-v1[data-log-drag="left"]{left:1%}.mcv-log-drag-v1[data-log-drag="right"]{right:2%}.mcv-log-fill-v1{position:absolute;left:0;right:0;bottom:0;height:var(--fill,0%);border-radius:0 0 50% 50%;background:rgba(255,255,255,.94);box-shadow:inset 0 1px 0 rgba(255,255,255,.8);transition:height .1s ease}.mcv-log-value-v1{position:absolute;z-index:6;top:76%;display:flex;align-items:baseline;justify-content:center;width:31%;height:7%;border-radius:999px;color:#301f27;background:rgba(255,255,255,.96);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;font-size:34px;font-weight:300;line-height:1}.mcv-log-value-v1 small{margin-left:3px;color:#93888d;font-size:15px;font-weight:500}.mcv-log-value-v1[data-log-output="left"]{left:8.5%}.mcv-log-value-v1[data-log-output="right"]{right:8.5%}.mcv-log-drag-v1.is-dragging .mcv-log-fill-v1{transition:none}.mcv-log-layer-v1.is-saved:after{display:none}.mcv-log-saved-sheet-v1{position:absolute;left:0;right:0;bottom:0;height:72.8%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 28px;border-radius:42px 42px 0 0;background:#fff8f4;text-align:center;animation:mcv-log-rise-v1 .36s cubic-bezier(.2,.9,.25,1)}.mcv-log-saved-bunny-v1{width:170px;height:138px;object-fit:cover;margin:0 0 20px}.mcv-log-saved-sheet-v1 h2{margin:0;color:#8d002b;font-family:"Snell Roundhand","Segoe Script","Bradley Hand",cursive;font-size:54px;line-height:1;font-weight:700}.mcv-log-saved-sheet-v1 h2:after{content:"";display:block;width:170px;height:18px;margin:3px auto 12px;border-bottom:3px solid #8d002b;border-radius:50%;transform:rotate(-2deg)}.mcv-log-saved-sheet-v1 p{margin:0;color:#8d7b80;font-size:14px}
      .mcv-log-layer-v1:after{display:none}.mcv-log-full-reference-v1{position:absolute;left:0;right:0;bottom:0;display:block;width:100%;height:auto;border-radius:42px 42px 0 0;clip-path:inset(0 round 42px 42px 0 0)}.mcv-log-drag-v1{top:54%;width:31%;height:18%;overflow:hidden;border-radius:50%}.mcv-log-drag-v1[data-log-drag="left"]{left:7%}.mcv-log-drag-v1[data-log-drag="right"]{right:7%}.mcv-log-value-v1{display:none;top:75%;height:6.5%;background:#fff}.mcv-log-layer-v1.has-log-adjustment .mcv-log-value-v1{display:flex}.mcv-log-fill-v1{z-index:2}.mcv-log-layer-v1.is-saved:after{display:none}
      .mcv-log-value-v1{width:34%;height:7%;top:75%}.mcv-log-value-v1[data-log-output="left"]{left:6%}.mcv-log-value-v1[data-log-output="right"]{right:6%}.mcv-log-fill-clip-v1{position:absolute;z-index:5;overflow:hidden;border-radius:50%;clip-path:ellipse(50% 50% at 50% 50%);pointer-events:none}.mcv-log-fill-clip-v1 .mcv-log-fill-v1{border-radius:0!important;-webkit-mask-image:radial-gradient(circle 19.5% at 50% 106%,transparent 99%,#000 100%);mask-image:radial-gradient(circle 19.5% at 50% 106%,transparent 99%,#000 100%)}.mcv-log-drag-v1{z-index:7;overflow:visible;border-radius:50%;background:transparent}
      .mcv-log-fill-clip-v1 .mcv-log-fill-v1{border-radius:0!important;-webkit-mask-image:none!important;mask-image:none!important}.mcv-log-drag-v1{display:grid;place-items:center;z-index:7;overflow:visible;border-radius:50%;background:#fff;box-shadow:0 12px 22px rgba(63,35,44,.14);color:#2d1720;transition:top .1s ease}.mcv-log-drag-v1:before,.mcv-log-drag-v1:after{content:"";position:absolute;left:50%;width:14px;height:14px;border:0 solid currentColor;border-width:3px 3px 0 0}.mcv-log-drag-v1:before{top:27%;transform:translateX(-50%) rotate(-45deg)}.mcv-log-drag-v1:after{bottom:27%;transform:translateX(-50%) rotate(135deg)}.mcv-log-drag-v1:focus-visible{outline:3px solid rgba(238,156,167,.72);outline-offset:3px}
      .mcv-log-reference-save-v1{z-index:8!important;border:0;border-radius:999px;transition:background .2s ease,box-shadow .2s ease,transform .2s ease}.mcv-log-reference-save-v1:disabled{cursor:not-allowed}.mcv-log-reference-save-v1.is-enabled{background:#770523!important;box-shadow:0 10px 22px rgba(119,5,35,.17)!important;cursor:pointer}.mcv-log-reference-save-v1.is-enabled:after{content:"Save";color:#fff;font-family:"Aeonik Soft Pro",-apple-system,BlinkMacSystemFont,"PingFang SC",Arial,sans-serif;font-size:16px;font-weight:700}.mcv-log-reference-save-v1.is-enabled:active{transform:scale(.985)}.mcv-log-reference-save-v1.is-enabled:focus-visible{outline:3px solid rgba(238,156,167,.72);outline-offset:3px}
      .mcv-page-content{position:relative!important;inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;width:auto!important;height:auto!important;min-height:0!important;margin:0 6%!important;padding:16px 0 calc(104px + env(safe-area-inset-bottom,0px))!important;display:flex!important;flex-direction:column!important;gap:16px!important;grid-template-rows:none!important;background:#f9f7f5!important}
      .mcv-mode-card,.mcv-level-module,.mcv-speed-module{width:100%!important;border-radius:24px!important}
      .mcv-control-panel{display:flex!important;flex-direction:column!important;height:auto!important;min-height:0!important;grid-template-rows:none!important;gap:16px!important;overflow:visible!important}
      .mcv-level-module{order:1;flex:0 0 clamp(310px,39svh,350px)!important;height:clamp(310px,39svh,350px)!important;min-height:clamp(310px,39svh,350px)!important;border-radius:24px!important;background:#fff!important;box-shadow:0 10px 28px rgba(82,54,63,.055)!important}
      .mcv-level-module .mcv-level-visual{inset:112px 24px 16px!important}
      .mcv-level-module .reference-level-zone{bottom:16px!important}
      .mcv-mode-card,.mcv-speed-module{flex:0 0 auto!important;min-height:0!important}
      .mcv-speed-module{order:3}
      .mcv-bottom-shell{position:fixed!important;z-index:50!important;left:6%!important;right:6%!important;bottom:16px!important;display:block!important;width:auto!important;margin:0!important;padding:0!important;overflow:visible!important;background:transparent!important}
      .mcv-control-actions{width:100%!important;gap:16px!important;background:transparent!important}
      .mcv-control-actions::before{display:none!important}
      .mcv-control-actions .hold-button{min-width:0!important}
      .mcv-control-actions .pause-button{flex:0 0 56px!important}
      .mcv-guide-invite,.mcv-guide-invite.cn-comfort-invite{display:none!important;position:static!important;width:0!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}.mcv-guide-invite.is-calibration-prompt-visible{position:fixed!important;z-index:75!important;left:6%!important;right:6%!important;bottom:calc(88px + env(safe-area-inset-bottom,0px))!important;width:auto!important;height:auto!important;min-height:0!important;margin:0!important;padding:28px 24px 24px!important;display:block!important;overflow:visible!important;border:1px solid #f1d9df!important;border-radius:28px!important;background:#fffdfa!important;box-shadow:0 18px 42px rgba(71,32,43,.18)!important}.mcv-trend-prompt-v1{text-align:center}.mcv-trend-prompt-v1 h3{margin:0;color:#6f1731;font-family:"Exposure[-10]",Georgia,serif;font-size:24px;line-height:1.25;font-weight:500}.mcv-trend-prompt-v1 p{margin:12px 0 0;color:#756a6e;font-size:13px;line-height:1.55}.mcv-trend-prompt-v1 .mcv-trend-actions-v1{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px}.mcv-trend-prompt-v1 button{height:48px;border-radius:999px;font-size:13px;font-weight:800}.mcv-trend-start-v1{color:#fff;background:#8e0028;box-shadow:0 9px 18px rgba(119,5,35,.15)}.mcv-trend-later-v1{color:#756a6e;border:1px solid #e7dfe1;background:#fbf9f8}
      .cn-comfort-invite .mcv-invite-header{text-align:center!important}
      .cn-comfort-invite h3{text-align:center!important;margin:0!important}
      .cn-comfort-invite .mcv-invite-copy{text-align:center!important}
      .cn-comfort-invite .cn-guide-video{width:100%!important;height:auto!important;aspect-ratio:16/9!important;margin:16px 0 0!important;border-radius:20px!important}
      .cn-comfort-invite .cn-guide-note{text-align:center!important;margin-top:12px!important}
      .cn-comfort-invite .mcv-invite-actions{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important;margin-top:14px!important}
      .cn-comfort-invite .mcv-invite-actions>button{width:100%!important;min-width:0!important;height:44px!important}
      .mcv-level-module>.mcv-comfort-entry.mcv-comfort-entry-v4{position:absolute!important;z-index:6!important;inset:0 0 auto!important;width:auto!important;max-width:none!important;height:104px!important;padding:17px 24px 14px!important;display:grid!important;grid-template-columns:minmax(0,1fr) 108px!important;grid-template-rows:1fr!important;align-items:stretch!important;gap:18px!important;border:0!important;border-bottom:1px solid rgba(238,218,224,.76)!important;border-radius:24px 24px 0 0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important;box-sizing:border-box!important}
      .mcv-comfort-entry.mcv-comfort-entry-v4[hidden]{display:none!important}
      .mcv-level-module>.mcv-comfort-placeholder.mcv-comfort-card-v4{position:absolute!important;z-index:6!important;inset:0 0 auto!important;width:auto!important;max-width:none!important;height:104px!important;padding:17px 24px 14px!important;display:grid!important;grid-template-columns:minmax(0,1fr) 108px!important;grid-template-rows:1fr!important;align-items:stretch!important;gap:18px!important;border:0!important;border-bottom:1px solid rgba(238,218,224,.76)!important;border-radius:24px 24px 0 0!important;background:transparent!important;box-shadow:none!important;box-sizing:border-box!important;overflow:visible!important}
      .mcv-level-module>.mcv-comfort-placeholder-v4{display:grid!important;grid-template-columns:minmax(0,1fr) 108px!important;align-items:stretch!important;gap:18px!important}
      .mcv-comfort-placeholder.mcv-comfort-card-v4[hidden]{display:none!important}
      .mcv-card-info-v5{min-width:0;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:1px 0}.mcv-card-title-row-v5{display:flex;align-items:center;gap:9px;min-width:0}.mcv-card-title-v5{color:#6f1731;font-size:19px;font-weight:800;letter-spacing:-.3px;line-height:1.1;white-space:nowrap}.mcv-card-status-v5{display:none!important}.mcv-card-copy-v5{color:#5b3742;font-size:12px;font-weight:750;white-space:normal;line-height:1.25}.mcv-card-meta-v5{color:#94878c;font-size:9.5px;font-weight:600;line-height:1.2}.mcv-card-actions-v5{display:flex;min-width:0;height:100%;flex-direction:column;align-items:stretch;justify-content:center;gap:4px;padding-left:7px;border-left:1px solid rgba(130,75,91,.10)}.mcv-card-primary-v5{width:108px;min-width:108px;min-height:42px;padding:0 8px;border-radius:15px;color:#fff;background:#90002b;font-size:10.5px;font-weight:800;line-height:1.2;white-space:normal}.mcv-card-secondary-v5{width:108px;min-width:108px;min-height:24px;padding:0;color:#821632;background:transparent;font-size:10px;font-weight:800;text-align:center}.mcv-card-primary-v5:active,.mcv-card-secondary-v5:active{transform:scale(.97)}
      .mcv-comfort-card-v4.is-bubble-active{z-index:35!important}.mcv-bottom-shell.is-bubble-active{z-index:41!important}.mcv-comfort-bubble-v5{position:absolute;z-index:42;left:6%;right:6%;bottom:calc(100% + 10px);height:62px;padding:9px 46px 9px 34px;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:1fr 1fr;align-items:center;column-gap:9px;border:1px solid #edd2da;border-radius:18px;background:#fffaf7;box-shadow:0 10px 24px rgba(73,39,50,.13);box-sizing:border-box}.mcv-comfort-bubble-v5::before{content:"";position:absolute;left:15px;top:50%;width:8px;height:8px;border-radius:50%;background:#9d0632;transform:translateY(-50%);animation:mcv-comfort-pulse-v5 1.8s ease-in-out infinite}.mcv-bubble-title-v5{grid-column:1;grid-row:1;color:#6d2438;font-size:10.5px;font-weight:800;line-height:1.2}.mcv-bubble-copy-v5{grid-column:1;grid-row:2;color:#8d7e83;font-size:9.5px;line-height:1.2}.mcv-bubble-start-v5{grid-column:2;grid-row:1/3;min-width:44px;min-height:44px;color:#8e0028;background:transparent;font-size:11px;font-weight:800}.mcv-bubble-close-v5{position:absolute;right:6px;top:5px;width:28px;height:28px;border-radius:50%;color:#806b72;background:transparent;font-size:17px}.mcv-comfort-bubble-v5.is-leaving{opacity:0;transform:translateY(5px);transition:opacity .16s ease,transform .16s ease}@keyframes mcv-comfort-pulse-v5{0%,100%{box-shadow:0 0 0 0 rgba(157,6,50,.22)}50%{box-shadow:0 0 0 6px rgba(157,6,50,0)}}
      .mcv-card-primary-v5:focus-visible,.mcv-card-secondary-v5:focus-visible,.mcv-bubble-start-v5:focus-visible,.mcv-bubble-close-v5:focus-visible{outline:2px solid #8e0028;outline-offset:2px}
      @media(max-width:360px){.mcv-level-module>.mcv-comfort-entry.mcv-comfort-entry-v4,.mcv-level-module>.mcv-comfort-placeholder.mcv-comfort-card-v4{grid-template-columns:minmax(0,1fr) 92px!important;padding:14px 16px!important;gap:14px!important}.mcv-card-copy-v5{font-size:11px}.mcv-card-primary-v5,.mcv-card-secondary-v5{width:92px;min-width:92px}.mcv-card-primary-v5{padding:0 7px}.mcv-card-actions-v5{padding-left:0;border-left:0}}
      @media (prefers-reduced-motion:reduce){.mcv-card-primary-v5,.mcv-card-secondary-v5,.mcv-comfort-bubble-v5{transition:none!important}.mcv-comfort-bubble-v5::before{animation:none!important}}
    `;
    doc.head.appendChild(surfaceStyle);
    const comfortFeedbackStyle = doc.createElement("style");
    comfortFeedbackStyle.textContent = `
      .mcv-card-primary-v5{box-shadow:0 7px 15px rgba(142,0,40,.14);transition:transform .18s ease,filter .18s ease,background .22s ease}
      .mcv-card-actions-v5.is-ramping{gap:2px}.mcv-card-actions-v5.is-ramping .mcv-card-primary-v5{min-height:34px;background:#9a173a}
      .mcv-card-tertiary-v5{width:108px;min-width:108px;min-height:19px;padding:0;color:#9b7781;background:transparent;font-size:9px;font-weight:700;text-align:center}
      .mcv-card-status-v5.is-ramping{color:#8e0028;background:#f9e8ec}.mcv-card-status-v5.is-active{color:#7c1733;background:#f5dce3}
      .mcv-comfort-toast-v5{position:fixed;z-index:80;left:50%;bottom:calc(90px + env(safe-area-inset-bottom,0px));width:min(calc(100% - 48px),350px);padding:11px 16px;border:1px solid rgba(132,61,81,.12);border-radius:18px;color:#653444;background:rgba(255,250,248,.96);box-shadow:0 10px 26px rgba(82,38,53,.13);font-size:11px;font-weight:700;line-height:1.45;text-align:center;pointer-events:none;opacity:0;transform:translate(-50%,10px);transition:opacity .24s ease,transform .24s ease}.mcv-comfort-toast-v5.is-visible{opacity:1;transform:translate(-50%,0)}
      .mcv-mode-card{order:0!important;flex:0 0 116px!important;height:116px!important;min-height:116px!important;padding:18px 28px!important;border:1px solid #f2d5db!important;border-radius:24px!important;background:#fff1f3!important;box-shadow:none!important;color:#531326!important}.mcv-rhythm-head-v6{display:flex;align-items:center;justify-content:space-between;height:25px}.mcv-rhythm-head-v6 strong{font-size:16px!important;font-weight:800!important;letter-spacing:-.15px}.mcv-rhythm-more-v6{display:grid;place-items:center;width:28px;height:28px;margin-right:-7px;border-radius:50%;color:#6e1732;background:transparent;font-size:26px;font-weight:400;line-height:1}.mcv-rhythm-options-v6{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:15px}.mcv-rhythm-options-v6 button{display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;height:48px;padding:0 8px;border-radius:999px;color:#a49aa0;background:rgba(255,255,255,.72);box-shadow:0 4px 10px rgba(96,47,61,.08);font-size:11px;font-weight:750;white-space:nowrap;transition:transform .18s ease,background .18s ease,color .18s ease,box-shadow .18s ease}.mcv-rhythm-icon-v6{width:19px;height:19px;flex:0 0 auto;fill:none;stroke:#c75770;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.mcv-expression-icon-v6{stroke-width:2.7}.mcv-rhythm-options-v6 button.is-active{color:#fff;background:linear-gradient(135deg,#8e0028,#c65771);box-shadow:0 7px 15px rgba(142,0,40,.17)}.mcv-rhythm-options-v6 button.is-active .mcv-rhythm-icon-v6{stroke:#fff}.mcv-rhythm-options-v6 button:active{transform:scale(.97)}
      @media(max-width:360px){.mcv-card-tertiary-v5{width:92px;min-width:92px}}
      @media(prefers-reduced-motion:reduce){.mcv-comfort-toast-v5,.mcv-card-primary-v5{transition:none!important}}
    `;
    doc.head.appendChild(comfortFeedbackStyle);
    comfortFeedbackStyle.textContent += `
      .mcv-phase-prompt-v6{position:fixed;z-index:86;left:24px;right:24px;bottom:calc(88px + env(safe-area-inset-bottom,0px));padding:24px 20px 18px;border:1px solid #f0d6dc;border-radius:28px;background:#fffdfa;box-shadow:0 20px 48px rgba(62,0,16,.20);animation:mcv-phase-prompt-in-v6 .22s ease-out}.mcv-phase-prompt-v6 h3{margin:0;color:#3e0010;font-family:"Exposure[-10]",Georgia,serif;font-size:24px;font-weight:500;line-height:1.25;text-align:center}.mcv-phase-prompt-v6 p{margin:9px 0 0;color:#75696e;font-size:12px;line-height:1.55;text-align:center}.mcv-phase-prompt-actions-v6{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:19px}.mcv-phase-prompt-actions-v6 button{min-height:46px;border-radius:999px;font-size:12px;font-weight:800}.mcv-phase-prompt-primary-v6{color:#fff;background:#770523;box-shadow:0 7px 16px rgba(119,5,35,.16)}.mcv-phase-prompt-secondary-v6{color:#75696e;border:1px solid #e4e2e3;background:#f9f7f5}.mcv-phase-prompt-actions-v6.is-single{grid-template-columns:1fr}.mcv-phase-prompt-close-v6{position:absolute;top:4px;right:5px;width:38px;height:38px;border-radius:50%;color:#806b72;background:transparent;font-size:22px;line-height:1}@keyframes mcv-phase-prompt-in-v6{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    `;
    // Keep the control screen free of transient session prompts. These state
    // changes remain functional; only the three demo notifications are muted.
    if (typeof win.showToast === "function" && !win.showToast.__comfortPromptsMuted) {
      const showToastBase = win.showToast;
      const mutedToastMessages = new Set(["Pumping session saved", "Let-down detected", "Comfort guide is ready"]);
      const showToastWithoutDemoPrompts = function (message, ...args) {
        if (mutedToastMessages.has(message)) return;
        return showToastBase.call(this, message, ...args);
      };
      showToastWithoutDemoPrompts.__comfortPromptsMuted = true;
      win.showToast = showToastWithoutDemoPrompts;
    }
    surfaceStyle.textContent += `
      .v4-progress{
        width:min(56%,240px)!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:8px!important;
        margin:10px auto 0!important;
        justify-self:center!important;
        align-self:center!important;
      }
    `;

    const precheckStyle = doc.createElement("style");
    precheckStyle.id = "precheckUnifiedV4";
    precheckStyle.textContent = ".cn-precheck{padding:14px 18px calc(18px + env(safe-area-inset-bottom))!important;background:#fbf7f3!important}\n.cn-precheck-status-v4{position:relative;width:100%;height:154px;flex:0 0 154px;display:grid;grid-template-columns:62px minmax(0,1fr) 62px;grid-template-rows:58px 1px 1fr;column-gap:12px;align-items:center;padding:14px 16px 20px;box-sizing:border-box;border-radius:30px;color:#fff;background:linear-gradient(125deg,#98012e,#bd2f55 58%,#cf627d);box-shadow:0 14px 30px rgba(113,30,57,.16)}.cn-precheck-status-v4:after{content:\"\";position:absolute;left:50%;bottom:8px;width:108px;height:5px;border-radius:99px;background:#fff;transform:translateX(-50%)}\n.cn-precheck-device-v4{grid-column:1;grid-row:1;display:grid;place-items:center;width:62px;height:58px;border-radius:18px;background:#fff;overflow:hidden}.cn-precheck-device-v4 img{display:block;width:90%;height:90%;object-fit:contain}\n.cn-precheck-product-v4{grid-column:2;grid-row:1;display:flex;align-items:center;gap:8px;min-width:0}.cn-precheck-product-v4 strong{font-size:24px;line-height:1}.cn-precheck-swap-v4{font-size:13px;line-height:.8;color:#efb5c4}\n.cn-precheck-chevron-v4{grid-column:3;grid-row:1;justify-self:end;font-size:32px;font-weight:300;color:#efb5c4}\n.cn-precheck-divider-v4{grid-column:1/4;grid-row:2;width:100%;height:1px;background:rgba(255,255,255,.2)}\n.cn-precheck-program-v4{grid-column:1/3;grid-row:3;align-self:end;display:flex;flex-direction:column;gap:5px}.cn-precheck-program-v4 strong{font-size:22px}.cn-precheck-program-v4 span{font-size:13px;color:#f8d8e1}\n.cn-precheck-play-v4{grid-column:3;grid-row:3;align-self:end;justify-self:end;width:58px;height:48px;border:0;border-radius:22px;color:#fff;background:#870022;font-size:19px;box-shadow:none}\n.cn-precheck-header{padding:16px 50px 12px!important}.cn-precheck-back{top:9px!important;width:46px!important;height:46px!important}.cn-precheck h2{font-size:20px!important;font-weight:650!important;letter-spacing:.5px!important}.cn-precheck-header p{margin-top:6px!important;font-size:12px!important}\n.cn-precheck-scroll{flex:1!important;min-height:0!important;gap:14px!important;padding:4px 5px 12px!important;margin:0!important;scroll-padding-inline:5px!important}\n.cn-check-card{flex:0 0 100%!important;min-height:220px!important;border-radius:28px!important;padding:24px!important;gap:20px!important;box-shadow:0 12px 30px rgba(82,54,63,.07)!important}.cn-check-card svg{width:108px!important;height:108px!important}.cn-check-card p{font-size:15px!important}\n.cn-precheck-dots{margin:0 0 13px!important}.cn-precheck-actions{margin-top:0!important;gap:12px!important}.cn-precheck-actions button{height:50px!important;border-radius:25px!important}\n@media(max-height:720px){.cn-precheck-status-v4{height:136px;flex-basis:136px}.cn-check-card{min-height:190px}.cn-check-card svg{width:90px!important;height:90px!important}}";
doc.head.appendChild(precheckStyle);
precheckStyle.textContent += "\n.cn-precheck-scroll{flex:0 0 auto!important;min-height:auto!important;margin:0 -18px!important;padding:6px 34px 14px!important;gap:14px!important;scroll-padding-inline:34px!important;scroll-behavior:smooth!important}\n.cn-check-card{flex:0 0 calc(100% - 76px)!important;min-height:0!important;aspect-ratio:20/23!important;border-radius:28px!important;scroll-snap-align:center!important;scroll-snap-stop:always!important}\n.cn-precheck-dots{margin:0 0 12px!important}\n.cn-precheck-actions{margin-top:auto!important}\n.cn-precheck-confirm{color:#fff!important;background:linear-gradient(135deg,#97032d,#c95170)!important}\n@media(max-height:720px){.cn-check-card{aspect-ratio:1/1!important}.cn-precheck-scroll{padding-top:2px!important;padding-bottom:8px!important}}";
precheckStyle.textContent += "\n.cn-precheck{inset:calc(28% - 16px) 14px calc(16px + env(safe-area-inset-bottom))!important;padding:18px!important;border:1px solid rgba(255,255,255,.86)!important;border-radius:34px!important;background:#fffaf7!important;box-shadow:0 0 0 100vmax rgba(58,35,43,.18),0 -12px 34px rgba(85,39,53,.15),0 8px 20px rgba(85,39,53,.08)!important;overflow:hidden!important;animation:mcv-sheet-rise-v4 .36s cubic-bezier(.2,.9,.25,1)!important}\n.cn-precheck-status-v4{display:none!important}\n.cn-precheck-header{padding-top:8px!important}\n.cn-precheck-back{left:auto!important;right:0!important;top:3px!important;font-size:26px!important}\n.cn-precheck-actions{grid-template-columns:1fr!important;padding:8px 0 0!important}\n.cn-precheck-confirm{grid-column:1!important;width:100%!important}\n@keyframes mcv-sheet-rise-v4{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}\n@media(max-height:720px){.cn-precheck{inset:calc(28% - 10px) 10px calc(10px + env(safe-area-inset-bottom))!important;border-radius:28px!important;padding:14px!important}}";
precheckStyle.textContent += "\n.cn-check-card.cn-learning-card{flex:0 0 84%!important;height:min(54vh,400px)!important;min-height:310px!important;aspect-ratio:auto!important;gap:8px!important;justify-content:center!important;padding:20px!important;box-sizing:border-box!important}.cn-check-card .cn-learning-image,.cn-check-card .cn-learning-media{display:block!important;width:84%!important;height:84%!important;max-width:312px!important;max-height:300px!important;flex:0 1 auto!important;object-fit:contain!important;object-position:center!important}.cn-check-card .cn-learning-media{position:relative!important}.cn-check-card .cn-learning-media .cn-learning-image{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important}.cn-learning-video-entry{position:absolute!important;left:8px!important;bottom:8px!important;z-index:2!important;height:36px!important;padding:0 13px!important;border:1px solid rgba(142,0,40,.14)!important;border-radius:999px!important;color:#8e0028!important;background:rgba(255,250,248,.9)!important;box-shadow:0 5px 12px rgba(82,33,47,.10)!important;font-size:11px!important;font-weight:800!important;backdrop-filter:blur(8px)!important}.cn-learning-video-entry:active{transform:scale(.97)!important}.cn-learning-video-modal{position:fixed!important;inset:0!important;z-index:120!important;display:grid!important;place-items:center!important;padding:24px!important;background:rgba(57,36,43,.42)!important}.cn-learning-video-card{width:min(100%,330px)!important;border-radius:28px!important;padding:18px!important;background:#fffaf7!important;box-shadow:0 18px 48px rgba(41,22,29,.28)!important}.cn-learning-video-head{display:flex!important;align-items:center!important;justify-content:space-between!important;margin-bottom:14px!important;color:#3d2b31!important;font-size:15px!important;font-weight:800!important}.cn-learning-video-close{width:34px!important;height:34px!important;border-radius:50%!important;color:#851433!important;background:#fff!important;font-size:21px!important}.cn-learning-video-stage{display:grid!important;place-items:center!important;min-height:175px!important;border-radius:20px!important;color:#fff!important;background:linear-gradient(135deg,#97032d,#c95170)!important;text-align:center!important}.cn-learning-video-stage strong{display:block!important;margin-top:8px!important;font-size:14px!important}.cn-learning-video-play{width:52px!important;height:52px!important;border:1px solid rgba(255,255,255,.75)!important;border-radius:50%!important;color:#fff!important;background:rgba(255,255,255,.12)!important;font-size:20px!important}.cn-learning-video-card p{margin:12px 0 0!important;color:#88797e!important;font-size:11px!important;line-height:1.5!important;text-align:center!important}.cn-check-card.cn-learning-card h3{margin:0!important;color:#7f1736!important;font-size:17px!important;line-height:1.3!important;font-weight:800!important}.cn-check-card.cn-learning-card p{margin:0!important;max-width:230px!important;color:#786c70!important;font-size:12px!important;font-weight:600!important;line-height:1.5!important}\n@media(max-height:720px){.cn-check-card.cn-learning-card{height:300px!important;min-height:300px!important}.cn-check-card .cn-learning-image,.cn-check-card .cn-learning-media{width:82%!important;height:80%!important;max-height:233px!important}.cn-check-card.cn-learning-card h3{font-size:15px!important}.cn-check-card.cn-learning-card p{font-size:11px!important}}";
precheckStyle.textContent += "\n.cn-precheck-video-entry{display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;width:max-content!important;height:36px!important;margin:0 auto 16px!important;padding:0 15px!important;border:1px solid #ead3da!important;border-radius:999px!important;color:#8e0028!important;background:#fff!important;box-shadow:0 5px 12px rgba(82,33,47,.07)!important;font-size:11px!important;font-weight:800!important}.cn-precheck-video-entry:active{transform:scale(.97)!important}";

function enhancePrecheck() {
      const page = doc.getElementById("cnPrecheck");
      if (!page || page.dataset.precheckEnhancedV4 === "true") return;
      page.dataset.precheckEnhancedV4 = "true";
      const close = page.querySelector(".cn-precheck-back");
      if (close) {
        close.textContent = "×";
        close.setAttribute("aria-label", "关闭开始前确认");
      }
  page.querySelector(".cn-precheck-return")?.remove();
  const confirm = page.querySelector(".cn-precheck-confirm");
  const scroll = page.querySelector(".cn-precheck-scroll");
  const dots = Array.from(page.querySelectorAll(".cn-precheck-dots i"));
  const cards = Array.from(scroll.querySelectorAll(".cn-check-card"));
  const learningCards = [
    `<img class="cn-learning-image" src="../assets/comfort-learning/comfort-feel.png" alt="舒适吸乳：有牵拉感但不刺痛、不夹痛"><h3>有力度，但不疼</h3><p>有牵拉感，但不刺痛、不夹痛</p>`,
    `<img class="cn-learning-image" src="../assets/comfort-learning/comfort-range.png" alt="吸力并非越高越好，找到舒适范围"><h3>不是越高越好</h3><p>找到身体能放松承受的档位</p>`,
    `<img class="cn-learning-image" src="../assets/comfort-learning/comfort-steps.png" alt="逐级调节吸力，不适立即降低并保存舒适档位"><h3>逐级慢调，舒适优先</h3><p>每次调高 1 档；不适立即降低</p>`
  ];
  cards.forEach((card, index) => {
    if (!learningCards[index]) return;
    card.classList.remove("cn-warn");
    card.classList.add("cn-learning-card");
    card.innerHTML = learningCards[index];
  });
  const videoEntry = doc.createElement("button");
  videoEntry.className = "cn-precheck-video-entry";
  videoEntry.type = "button";
  videoEntry.setAttribute("aria-label", "观看 30 秒舒适档位演示");
  videoEntry.innerHTML = "▶&nbsp; 观看 30 秒演示";
  page.querySelector(".cn-precheck-dots")?.insertAdjacentElement("afterend", videoEntry);
  videoEntry.addEventListener("click", () => {
    const modal = doc.createElement("section");
    modal.className = "cn-learning-video-modal";
    modal.innerHTML = `<div class="cn-learning-video-card" role="dialog" aria-modal="true" aria-label="30 秒舒适档位演示"><div class="cn-learning-video-head"><span>30 秒操作演示</span><button class="cn-learning-video-close" type="button" aria-label="关闭演示">×</button></div><div class="cn-learning-video-stage"><div><button class="cn-learning-video-play" type="button" aria-label="播放演示">▶</button><strong>逐级慢调，舒适优先</strong></div></div><p>这是演示入口；接入正式视频后可直接在此播放。</p></div>`;
    doc.body.appendChild(modal);
    modal.querySelector(".cn-learning-video-close").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", event => { if (event.target === modal) modal.remove(); });
  });
  const keepReady = () => {
    confirm.disabled = false;
    confirm.classList.add("is-ready");
  };
  const syncDots = () => {
    let active = 0;
    let distance = Infinity;
    cards.forEach((card, index) => {
      const next = Math.abs((card.offsetLeft + card.offsetWidth / 2) - (scroll.scrollLeft + scroll.clientWidth / 2));
      if (next < distance) { distance = next; active = index; }
    });
    dots.forEach((dot, index) => dot.classList.toggle("is-active", index === active));
    keepReady();
  };
  keepReady();
  confirm.addEventListener("click", (event) => {
    if (confirm.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    // Mount the next sheet above the current one first, then remove the old
    // sheet. This keeps the dimmed control page from flashing between steps.
    // `showCalibration` is in this install scope and is hoisted, whereas the
    // exported window hook can briefly be unavailable while the iframe boots.
    // Calling the local function makes the primary action reliable on the
    // first tap as well as subsequent taps.
    showCalibration({ seamless: true });
    page.remove();
  }, true);
  scroll.addEventListener("scroll", () => requestAnimationFrame(syncDots), { passive: true });
}
    new MutationObserver(enhancePrecheck).observe(doc.body, { childList: true });

    function enhanceNativeControlHeader() {
      const page = doc.querySelector(".control-reference-page");
      if (!page || page.querySelector(".mcv-native-head-v4")) return;
      const header = doc.createElement("section");
      header.className = "mcv-native-head-v4";
      header.setAttribute("aria-label", "Pump control header");
      header.innerHTML = `<nav class="mcv-native-nav-v4"><button class="mcv-native-icon-button-v4 mcv-native-back-v4" type="button" aria-label="Back">‹</button><h2>Pump Control</h2><span class="mcv-native-tools-v4"><button class="mcv-native-gear-v4" type="button" aria-label="Settings">⚙</button></span></nav><div class="mcv-native-message-canvas-v7" aria-label="消息提示区域"></div><div class="mcv-native-device-v4"><div class="mcv-native-pumps-v4" role="img" aria-label="Dual breast pumps"><span class="mcv-native-pump-v4 mcv-native-pump-v4--left"></span><span class="mcv-native-pump-v4 mcv-native-pump-v4--right"></span></div><div class="mcv-native-pump-stats-v6" aria-label="设备状态"><span><em>02:50</em><small>▣ 99%</small></span><span><em>01:33</em><small>▣ 99%</small></span></div></div>`;
      page.prepend(header);
    }
    // The prototype now opens directly on Pump Control. Keep the old dashboard
    // out of the launch path while preserving the existing control-page logic.
    function openPumpControlAsInitialView() {
      const home = doc.getElementById("homeView");
      const control = doc.getElementById("controlView");
      const trigger = doc.getElementById("openControl");
      if (home && control && home.hidden === false && control.hidden && trigger) trigger.click();
    }
    openPumpControlAsInitialView();
    enhanceNativeControlHeader();

    function setHeaderMessage(message = "") {
      const canvas = doc.querySelector(".mcv-native-message-canvas-v7");
      if (!canvas) return;
      canvas.textContent = message;
    }
    setHeaderMessage("在舒适范围内，试试更有力度的吸力，帮助乳汁更顺畅的开始流出。");

    function enforceContinuousHeaderBackground() {
      const nativeHeader = doc.querySelector(".mcv-native-head-v4");
      const nativeNav = doc.querySelector(".mcv-native-nav-v4");
      const background = "radial-gradient(ellipse 82% 66% at 50% 52%,rgba(255,237,174,.86) 0%,rgba(255,237,174,.52) 34%,rgba(255,229,203,.18) 62%,transparent 76%),linear-gradient(180deg,#f8d7d7 0%,#fce4d5 23%,#fff0c7 48%,#fce8df 71%,#f9f7f5 100%)";
      nativeHeader?.style.setProperty("background", background, "important");
      nativeNav?.style.setProperty("background", "transparent", "important");
      nativeNav?.style.setProperty("backdrop-filter", "none", "important");
    }
    enforceContinuousHeaderBackground();
    win.setTimeout(enforceContinuousHeaderBackground, 0);
    win.setTimeout(enforceContinuousHeaderBackground, 160);

    function enhanceRhythmCard() {
      const card = doc.querySelector(".mcv-mode-card");
      if (!card || card.dataset.rhythmCardV6 === "true") return;
      card.dataset.rhythmCardV6 = "true";
      const sourceLabel = card.querySelector("#modeLabel");
      if (sourceLabel) sourceLabel.setAttribute("aria-hidden", "true");
      const heartIcon = `<svg class="mcv-rhythm-icon-v6" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.2 5.2 0 0 0-7.4 0L12 6.3l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21l8.8-8.7a5.2 5.2 0 0 0 0-7.4Z"/></svg>`;
      const expressionIcon = `<svg class="mcv-rhythm-icon-v6 mcv-expression-icon-v6" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.1 3.2C9.4 6.5 4.2 10.1 4.2 15.3a7.8 7.8 0 0 0 15.6 0c0-3.4-2.2-6.5-5.2-9.6"/><path d="M9.4 17.5c1.8.9 4.2.2 5.1-1.6.7-1.4.4-3.2-.8-4.2.1 2.1-1.1 3.8-3.3 4.1"/></svg>`;
      const mixedIcon = `<svg class="mcv-rhythm-icon-v6" viewBox="0 0 28 24" aria-hidden="true"><path d="M18.3 4.9a5.2 5.2 0 0 0-7.4 0L9.5 6.3 8.1 4.9a5.2 5.2 0 0 0-7.4 7.4L9.5 21l8.8-8.7a5.2 5.2 0 0 0 0-7.4Z"/><path d="M21.3 6.6c3 1.2 4.4 4.8 2.6 7.6-.8 1.2-1.8 2-3.1 2.5"/></svg>`;
      card.innerHTML = `<div class="mcv-rhythm-head-v6"><strong>Stimulation</strong><button type="button" class="mcv-rhythm-more-v6" aria-label="选择韵律">›</button></div><div class="mcv-rhythm-options-v6" role="group" aria-label="吸乳韵律"><button type="button" class="is-active" data-rhythm="Stimulation">${heartIcon}Stimulation</button><button type="button" data-rhythm="Expression">${expressionIcon}Expression</button><button type="button" data-rhythm="Mixed">${mixedIcon}Mixed</button></div>`;
      const title = card.querySelector(".mcv-rhythm-head-v6 strong");
      const setSelectedRhythm = rhythm => {
        selectedRhythm = rhythm;
        title.textContent = rhythm;
        card.querySelectorAll("[data-rhythm]").forEach(item => item.classList.toggle("is-active", item.dataset.rhythm === rhythm));
        if (rhythm !== "Expression") expressionGuideDeferred = false;
        setHeaderMessage(rhythm === "Stimulation" ? "在舒适范围内，试试更有力度的吸力，帮助乳汁更顺畅的开始流出。" : "");
        syncComfortCards();
      };
      win.__setSelectedRhythmV6 = setSelectedRhythm;
      card.querySelectorAll("[data-rhythm]").forEach(button => {
        button.addEventListener("click", () => {
          setSelectedRhythm(button.dataset.rhythm);
          if (selectedRhythm === "Expression" && startPumpingButton?.hidden) win.__enterExpressionManuallyV6?.();
          if (selectedRhythm !== "Expression") {
            win.clearTimeout(comfortBubbleDemoTimer);
            if (!calibrationInviteShownThisSession) hideCalibrationInvite();
          } else if (startPumpingButton?.hidden && !calibrationInviteShownThisSession) {
            // A running session may switch into Expression manually. Treat
            // that transition exactly like starting a session in Expression.
            comfortBubbleDemoTimer = win.setTimeout(() => {
              if (trendPromptIsAvailable()) presentTrendPrompt();
              else showPhasePrompt("Expression");
            }, 300);
          }
          if (typeof win.showToast === "function") win.showToast(`${button.dataset.rhythm} rhythm selected`);
        });
      });
    }
    enhanceRhythmCard();

    // There is no longer a dashboard destination in this prototype. Retain the
    // familiar back affordance without allowing it to reveal the removed page.
    const controlBack = doc.getElementById("backHome");
    if (controlBack) {
      controlBack.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);
    }

    const inviteCopy = doc.querySelector(".cn-comfort-invite .mcv-invite-copy");
    if (inviteCopy) inviteCopy.textContent = "仅需 1 分钟，找到「有力度但不疼」的舒适档位";

    function savedComfortProfile() {
      const value = safeRead(PROFILE_KEY);
      if (!value || !Number.isFinite(value.leftLevel) || !Number.isFinite(value.rightLevel)) return null;
      const normalized = {
        ...value,
        leftLevel: Math.max(1, Math.min(MAX_LEVEL, value.leftLevel)),
        rightLevel: Math.max(1, Math.min(MAX_LEVEL, value.rightLevel))
      };
      if (normalized.leftLevel !== value.leftLevel || normalized.rightLevel !== value.rightLevel) safeWrite(PROFILE_KEY, normalized);
      return normalized;
    }

    function comfortDraft() {
      const value = safeRead(DRAFT_KEY);
      return value && (value.leftDone || value.rightDone || value.side) ? value : null;
    }

    let comfortRamp = null;
    let comfortToastTimer = 0;

    function showComfortToast(message, duration = 2400) {
      let toast = doc.querySelector(".mcv-comfort-toast-v5");
      if (!toast) {
        toast = doc.createElement("div");
        toast.className = "mcv-comfort-toast-v5";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        doc.body.appendChild(toast);
      }
      win.clearTimeout(comfortToastTimer);
      toast.textContent = message;
      toast.classList.add("is-visible");
      comfortToastTimer = win.setTimeout(() => toast.classList.remove("is-visible"), duration);
    }

    function stopComfortRamp(reason) {
      if (!comfortRamp) return;
      win.clearTimeout(comfortRamp.timer);
      comfortRamp = null;
      syncComfortCards();
      if (reason) showComfortToast(reason, 1500);
    }

    function openComfortLearning() {
      const trigger = doc.getElementById("startGuide");
      if (trigger) trigger.click();
      else showCalibration();
    }

    function applySavedComfort() {
      const profile = savedComfortProfile();
      const current = { left: readLevel("left"), right: readLevel("right") };
      const targets = {
        left: Math.max(current.left, Math.max(1, Math.min(MAX_LEVEL, profile?.leftLevel || 3))),
        right: Math.max(current.right, Math.max(1, Math.min(MAX_LEVEL, profile?.rightLevel || 3)))
      };
      stopComfortRamp();
      const start = { ...current };
      comfortRamp = { targets, current: { ...start }, paused: false, timer: 0 };
      showComfortToast(`正在从 L${start.left} / R${start.right} 平缓升至 L${targets.left} / R${targets.right}，可随时手动调整`);
      syncComfortCards();
      const step = () => {
        if (!comfortRamp || comfortRamp.paused) return;
        let changed = false;
        ["left", "right"].forEach(side => {
          if (comfortRamp.current[side] < comfortRamp.targets[side]) {
            comfortRamp.current[side] += 1;
            setPumpLevel(side, comfortRamp.current[side]);
            changed = true;
          }
        });
        syncComfortCards();
        if (changed) { comfortRamp.timer = win.setTimeout(step, 2000); return; }
        const completedTargets = comfortRamp.targets;
        safeWrite(PROFILE_KEY, { ...(savedComfortProfile() || {}), leftLevel:completedTargets.left, rightLevel:completedTargets.right, status:"active", lastValidatedAt:new Date().toISOString(), version:2 });
        comfortRamp = null;
        buzz([8, 20, 8]);
        syncComfortCards();
        showComfortToast("已到达舒适档位", 1500);
      };
      comfortRamp.timer = win.setTimeout(step, 2000);
    }

    function comfortState() {
      if (comfortRamp) return { name:comfortRamp.paused ? "已暂停" : "升档中", kind:"ramping", ramp:comfortRamp };
      const profile = savedComfortProfile();
      const draft = comfortDraft();
      if (draft && !(draft.leftDone && draft.rightDone)) return { name:"未完成", kind:"incomplete", draft };
      if (profile) {
        const suggested = profile.reviewRecommended === true || /review|recommended/i.test(String(profile.status || ""));
        if (suggested) return { name:"建议更新", kind:"suggested", profile };
        const matches = readLevel("left") === profile.leftLevel && readLevel("right") === profile.rightLevel;
        return { name:matches ? "使用中" : "未应用", kind:matches ? "using" : "unapplied", profile };
      }
      return { name:"未设置", kind:"unset" };
    }

    function draftSummary(draft) {
      if (draft.leftDone && !draft.rightDone) return "左侧已完成 · 右侧待设置";
      if (!draft.leftDone && draft.rightDone) return "右侧已完成 · 左侧待设置";
      return draft.side === "right" ? "左侧已完成 · 右侧设置中" : "左侧设置中 · 右侧待设置";
    }

    function prepareComfortCard(card, isPlaceholder) {
      if (!card || card.dataset.comfortCardV5 === "true") return;
      card.dataset.comfortCardV5 = "true";
      card.classList.add(isPlaceholder ? "mcv-comfort-placeholder-v4" : "mcv-comfort-entry-v4", "mcv-comfort-card-v4");
      card.innerHTML = `<div class="mcv-card-info-v5"><div class="mcv-card-title-row-v5"><strong class="mcv-card-title-v5">舒适档位</strong><span class="mcv-card-status-v5"></span></div><div class="mcv-card-copy-v5"></div><div class="mcv-card-meta-v5"></div></div><div class="mcv-card-actions-v5"></div>`;
    }

    function renderComfortCard(card) {
      if (!card) return;
      prepareComfortCard(card, card.id === "comfortPlaceholder");
      const state = comfortState();
      const status = card.querySelector(".mcv-card-status-v5");
      const copy = card.querySelector(".mcv-card-copy-v5");
      const meta = card.querySelector(".mcv-card-meta-v5");
      const actions = card.querySelector(".mcv-card-actions-v5");
      status.textContent = state.name;
      status.classList.toggle("is-ramping", state.kind === "ramping");
      status.classList.toggle("is-active", state.kind === "using");
      actions.replaceChildren();
      actions.classList.toggle("is-ramping", state.kind === "ramping");
      let primary = "", secondary = "", primaryAction = null, secondaryAction = null;
      const sessionIsActive = doc.getElementById("startPumping")?.hidden === true;
      if (sessionIsActive && selectedRhythm === "Stimulation") {
        copy.textContent = "吸乳阶段即将开始";
        meta.textContent = "感觉舒适时，可每次上调 1 档。";
      } else if (sessionIsActive && selectedRhythm === "Expression" && !expressionGuideDeferred) {
        status.textContent = "吸乳阶段";
        copy.textContent = "已进入吸乳阶段";
        meta.textContent = "可花约 1 分钟，找到左右侧最舒服的吸力。";
        primary = "开始校准"; primaryAction = () => showCalibration();
        secondary = "稍后再说"; secondaryAction = () => { expressionGuideDeferred = true; syncComfortCards(); };
      } else if (state.kind === "unset") {
        copy.textContent = "分别找到左右两侧舒服的吸力"; meta.textContent = "约需1分钟";
        primary = "舒适启动"; primaryAction = applySavedComfort;
      } else if (state.kind === "ramping") {
        const { current, targets, paused } = state.ramp;
        copy.textContent = "正在平缓升至舒适档位";
        meta.textContent = `L${current.left} / R${current.right} → L${targets.left} / R${targets.right}`;
        primary = paused ? "继续升档" : "暂停";
        primaryAction = () => {
          if (!comfortRamp) return;
          comfortRamp.paused = !comfortRamp.paused;
          if (!comfortRamp.paused) {
            const resume = () => {
              if (!comfortRamp || comfortRamp.paused) return;
              let changed = false;
              ["left", "right"].forEach(side => {
                if (comfortRamp.current[side] < comfortRamp.targets[side]) { comfortRamp.current[side] += 1; setPumpLevel(side, comfortRamp.current[side]); changed = true; }
              });
              syncComfortCards();
              if (changed) comfortRamp.timer = win.setTimeout(resume, 2000);
              else { const completedTargets = comfortRamp.targets; safeWrite(PROFILE_KEY, { ...(savedComfortProfile() || {}), leftLevel:completedTargets.left, rightLevel:completedTargets.right, status:"active", lastValidatedAt:new Date().toISOString(), version:2 }); comfortRamp = null; buzz([8,20,8]); syncComfortCards(); showComfortToast("已到达舒适档位", 1500); }
            };
            comfortRamp.timer = win.setTimeout(resume, 2000);
          }
          syncComfortCards();
        };
        secondary = "降一档";
        secondaryAction = () => {
          if (!comfortRamp) return;
          ["left", "right"].forEach(side => {
            comfortRamp.current[side] = Math.max(1, comfortRamp.current[side] - 1);
            setPumpLevel(side, comfortRamp.current[side]);
          });
          syncComfortCards();
        };
      } else if (state.kind === "incomplete") {
        copy.textContent = draftSummary(state.draft); meta.textContent = "进度已自动保存";
        primary = "继续设置"; primaryAction = showCalibration;
      } else if (state.kind === "unapplied") {
        copy.textContent = `已保存  L ${state.profile.leftLevel} · R ${state.profile.rightLevel}`; meta.textContent = "当前档位与舒适基准不同";
        primary = "舒适启动"; primaryAction = applySavedComfort; secondary = "重新设置"; secondaryAction = openComfortLearning;
      } else if (state.kind === "using") {
        copy.textContent = `L ${state.profile.leftLevel} · R ${state.profile.rightLevel}`; meta.textContent = "当前正在使用保存档位";
        secondary = "重新设置"; secondaryAction = openComfortLearning;
      } else {
        copy.textContent = `已保存  L ${state.profile.leftLevel} · R ${state.profile.rightLevel}`; meta.textContent = "近期经常手动调整";
        primary = "重新校准"; primaryAction = openComfortLearning;
      }
      if (secondary) {
        const button = doc.createElement("button"); button.type = "button"; button.className = "mcv-card-secondary-v5"; button.textContent = secondary; button.setAttribute("aria-label", secondary + "舒适档位");
        button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); secondaryAction(); }); actions.appendChild(button);
      }
      if (primary) {
        const button = doc.createElement("button"); button.type = "button"; button.className = "mcv-card-primary-v5"; button.textContent = primary; button.setAttribute("aria-label", primary);
        button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); primaryAction(); }); actions.appendChild(button);
      }
      if (state.kind === "ramping") {
        const cancel = doc.createElement("button"); cancel.type = "button"; cancel.className = "mcv-card-tertiary-v5"; cancel.textContent = "取消自动升档"; cancel.setAttribute("aria-label", "取消自动升档");
        cancel.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); stopComfortRamp("已取消自动升档"); }); actions.appendChild(cancel);
      }
    }

    function enhanceComfortCards() {
      prepareComfortCard(doc.getElementById("comfortEntry"), false);
      prepareComfortCard(doc.getElementById("comfortPlaceholder"), true);
      syncComfortCards = () => {
        renderComfortCard(doc.getElementById("comfortEntry"));
        renderComfortCard(doc.getElementById("comfortPlaceholder"));
        syncComfortPlaceholder = syncComfortCards;
      };
      win.__syncComfortCardsV5 = syncComfortCards;
      syncComfortCards();
    }

    enhanceComfortCards();

    // A direct adjustment on either underlying level control always takes
    // precedence over the automation, without changing the control itself.
    ["leftLevelChip", "rightLevelChip", "leftLevelZone", "rightLevelZone"].forEach(id => {
      const control = doc.getElementById(id);
      if (!control) return;
      control.addEventListener("pointerdown", () => stopComfortRamp("已切换为手动调整"), true);
      control.addEventListener("keydown", event => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") stopComfortRamp("已切换为手动调整");
      }, true);
    });

    // Capture the level module before inserting new content below it.  Its
    // original visual height is a fixed design constraint, never a spacer.
    let originalLevelModuleHeight = 0;
    function rememberOriginalLevelModuleHeight() {
      const levelModule = doc.querySelector(".mcv-level-module");
      if (!levelModule || originalLevelModuleHeight) return;
      const height = Math.round(levelModule.getBoundingClientRect().height);
      if (height) originalLevelModuleHeight = height;
    }

    function mergeComfortCardIntoLevelModule() {
      const levelModule = doc.querySelector(".mcv-level-module");
      const entry = doc.getElementById("comfortEntry");
      const placeholder = doc.getElementById("comfortPlaceholder");
      if (!levelModule || !entry || !placeholder || levelModule.dataset.comfortCardsMerged === "true") return;
      levelModule.dataset.comfortCardsMerged = "true";
      entry.classList.add("mcv-comfort-card-v4");
      placeholder.classList.add("mcv-comfort-card-v4");
      levelModule.insertAdjacentElement("afterbegin", entry);
      levelModule.insertAdjacentElement("afterbegin", placeholder);
    }

    rememberOriginalLevelModuleHeight();
    mergeComfortCardIntoLevelModule();

    // Keep every control in the same vertical flow.  The phone remains a
    // fixed-height viewport, while its content scrolls naturally below it.
    function moveBottomActionsIntoScrollFlow() {
      const panel = doc.querySelector(".mcv-control-panel");
      const bottomShell = doc.querySelector(".mcv-bottom-shell");
      if (!panel || !bottomShell || bottomShell.parentElement === panel) return;
      panel.appendChild(bottomShell);
    }
    moveBottomActionsIntoScrollFlow();

    function retainComfortCardDuringSession() {
      const entry = doc.getElementById("comfortEntry");
      const placeholder = doc.getElementById("comfortPlaceholder");
      if (!entry) return;
      keepComfortCardVisible = true;
      entry.hidden = false;
      entry.classList.add("is-ready");
      if (placeholder) placeholder.hidden = true;
      syncComfortCards();
    }

    function hideComfortCards() {
      // The comfort card is a persistent session affordance. Base-flow state
      // changes must not remove it, including while calibration is open.
      retainComfortCardDuringSession();
    }

    // Keep the card visible from the initial control screen onward. The
    // observer below restores it if the underlying prototype toggles it.
    retainComfortCardDuringSession();

    // The level panel must keep its idle height while pumping starts.  The
    // running-state layout changes below it must never stretch the sliders.
    function lockOriginalLevelModuleHeight() {
      // Flow layout uses the original design height defined in CSS. Do not
      // capture a transient collapsed measurement during initial rendering.
    }
    win.requestAnimationFrame(lockOriginalLevelModuleHeight);

    function readLevel(side) {
      const node = doc.getElementById(side + "LevelChip");
      const value = Number.parseInt(node && node.textContent, 10);
      return Number.isFinite(value) ? Math.max(1, Math.min(MAX_LEVEL, value)) : 3;
    }

    function setPumpLevel(side, value) {
      if (typeof win.setLevel === "function") win.setLevel(side, value, "comfort-guide");
    }

    function safeRead(key) {
      try { return JSON.parse(win.localStorage.getItem(key) || "null"); }
      catch (_) { return null; }
    }

    function safeWrite(key, value) {
      try { win.localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (_) { return false; }
    }

    function safeRemove(key) {
      try { win.localStorage.removeItem(key); } catch (_) {}
    }

    function buzz(pattern) {
      if (win.navigator.vibrate) win.navigator.vibrate(pattern || 8);
    }

    function removeComfortBubble(immediate) {
      win.clearTimeout(comfortBubbleTimer);
      comfortBubbleTimer = 0;
      const bubble = doc.querySelector(".mcv-comfort-bubble-v5");
      if (!bubble) return;
      const anchor = bubble.parentElement;
      const finish = () => { bubble.remove(); anchor?.classList.remove("is-bubble-active"); };
      if (immediate || win.matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
      else { bubble.classList.add("is-leaving"); win.setTimeout(finish, 180); }
    }

    function removePhasePrompt() {
      doc.querySelector(".mcv-phase-prompt-v6")?.remove();
    }

    function showPhasePrompt(phase = selectedRhythm) {
      const isStimulation = phase === "Stimulation";
      if (isStimulation) {
        removePhasePrompt();
        setHeaderMessage("在舒适范围内，试试更有力度的吸力，帮助乳汁更顺畅的开始流出。");
        return;
      }
      if (trendPromptIsAvailable() || doc.getElementById("startPumping")?.hidden !== true) return;
      removePhasePrompt();
      const prompt = doc.createElement("aside");
      prompt.className = "mcv-phase-prompt-v6";
      prompt.setAttribute("role", "dialog");
      prompt.setAttribute("aria-modal", "false");
      prompt.setAttribute("aria-label", "吸乳阶段提示");
      prompt.innerHTML = `<button type="button" class="mcv-phase-prompt-close-v6" aria-label="关闭提示">×</button><h3>已进入吸乳阶段</h3><p>现在可以花约 1 分钟，分别找到左右侧最舒服的吸力。</p><div class="mcv-phase-prompt-actions-v6"><button type="button" class="mcv-phase-prompt-primary-v6">开始校准</button><button type="button" class="mcv-phase-prompt-secondary-v6">稍后再说</button></div>`;
      doc.body.appendChild(prompt);
      const close = () => removePhasePrompt();
      prompt.querySelector(".mcv-phase-prompt-close-v6").addEventListener("click", close);
      prompt.querySelector(".mcv-phase-prompt-primary-v6").addEventListener("click", () => { close(); showCalibration(); });
      prompt.querySelector(".mcv-phase-prompt-secondary-v6").addEventListener("click", () => { expressionGuideDeferred = true; close(); syncComfortCards(); });
    }

    function comfortPromptBlocked() {
      const paused = doc.querySelector(".pause-button.is-paused,[aria-label*='恢复'],.is-paused");
      return !!paused || Date.now() - lastComfortInteractionAt < 900 || !doc.getElementById("comfortEntry")?.classList.contains("is-ready");
    }

    function comfortBubbleAnchor() {
      // Anchor to the fixed finish-action shell so the bubble floats exactly
      // 10px above Hold to finish rather than obscuring level controls.
      return doc.querySelector(".mcv-bottom-shell");
    }

    function showComfortBubble(force) {
      // The comfort card itself presents the available action; no extra
      // expression-phase prompt is needed above the fixed bottom controls.
      return;
      const entry = doc.getElementById("comfortEntry");
      const anchor = comfortBubbleAnchor();
      if (!entry || !anchor || (!force && (comfortBubbleDismissed || comfortPromptBlocked()))) return;
      removeComfortBubble(true);
      anchor.classList.add("is-bubble-active");
      const bubble = doc.createElement("aside");
      bubble.className = "mcv-comfort-bubble-v5";
      bubble.setAttribute("role", "status");
      bubble.setAttribute("aria-label", "已进入吸乳阶段，是否开始设置舒适档位");
      bubble.innerHTML = `<strong class="mcv-bubble-title-v5">已进入吸乳阶段</strong><span class="mcv-bubble-copy-v5">想用约1分钟找到舒适档位吗？</span><button class="mcv-bubble-start-v5" type="button">开始</button><button class="mcv-bubble-close-v5" type="button" aria-label="关闭本次提示">×</button>`;
      anchor.appendChild(bubble);
      bubble.querySelector(".mcv-bubble-start-v5").addEventListener("click", event => {
        event.preventDefault(); event.stopPropagation(); comfortBubbleDismissed = true; removeComfortBubble(true); openComfortLearning();
      });
      bubble.querySelector(".mcv-bubble-close-v5").addEventListener("click", event => {
        event.preventDefault(); event.stopPropagation(); comfortBubbleDismissed = true; removeComfortBubble();
      });
      comfortBubbleTimer = win.setTimeout(() => removeComfortBubble(), 5000);
    }

    function scheduleComfortBubble() {
      return;
      win.clearTimeout(comfortBubbleTimer);
      comfortBubbleTimer = 0;
      if (comfortBubbleDismissed) return;
      const entry = doc.getElementById("comfortEntry");
      if (!entry?.classList.contains("is-ready")) return;
      comfortBubbleTimer = win.setTimeout(() => {
        if (comfortPromptBlocked()) { scheduleComfortBubble(); return; }
        showComfortBubble();
      }, 3000);
    }

    function readPumpingHistory() {
      const history = safeRead(PUMPING_HISTORY_KEY);
      return Array.isArray(history) ? history.filter(item => Number.isFinite(item?.total) && item.total > 0).slice(-12) : [];
    }

    function recordPumpingSession(amounts) {
      const left = Math.round(Number(amounts.left) || 0);
      const right = Math.round(Number(amounts.right) || 0);
      const total = left + right;
      // A session is valid only when it contains a positive, saved volume.
      if (!total) return;
      const history = readPumpingHistory();
      history.push({ left, right, total, savedAt: new Date().toISOString() });
      safeWrite(PUMPING_HISTORY_KEY, history.slice(-12));
    }

    function hasThreeDecliningPumpingRecords() {
      const recent = readPumpingHistory().slice(-3);
      return recent.length === 3 && recent[0].total > recent[1].total && recent[1].total > recent[2].total;
    }

    function decliningTrendSignature() {
      return readPumpingHistory().slice(-3).map(item => `${item.total}:${item.savedAt}`).join("|");
    }

    function trendPromptIsAvailable() {
      const state = safeRead(TREND_PROMPT_KEY);
      const deferredAt = Number(state?.deferredAt || 0);
      // Respect "Later" for seven days; the underlying trend is never shown.
      return hasThreeDecliningPumpingRecords() &&
        Date.now() - deferredAt > 7 * 24 * 60 * 60 * 1000 &&
        state?.shownFor !== decliningTrendSignature();
    }

    function presentTrendPrompt() {
      const invite = doc.getElementById("guideInvite");
      if (!invite || !trendPromptIsAvailable()) return;
      calibrationInviteShownThisSession = true;
      invite.classList.add("is-calibration-prompt-visible");
      invite.hidden = false;
      invite.innerHTML = `<section class="mcv-trend-prompt-v1" aria-label="舒适档位建议"><h3>近期吸乳体验是否有变化？</h3><p>如果吸力感受和以前不同，<br>可以尝试微调舒适档位。</p><div class="mcv-trend-actions-v1"><button class="mcv-trend-start-v1" type="button">开始校准</button><button class="mcv-trend-later-v1" type="button">稍后再说</button></div></section>`;
      invite.querySelector(".mcv-trend-start-v1").addEventListener("click", () => {
        safeWrite(TREND_PROMPT_KEY, { startedAt: Date.now(), shownFor: decliningTrendSignature() });
        hideCalibrationInvite();
        showCalibration();
      });
      invite.querySelector(".mcv-trend-later-v1").addEventListener("click", () => {
        safeWrite(TREND_PROMPT_KEY, { deferredAt: Date.now() });
        hideCalibrationInvite();
      });
    }

    function armDemoComfortBubble() {
      // Capture the untouched control-panel height in the click capture phase,
      // before the base Start handler changes the running-state layout.
      lockOriginalLevelModuleHeight();
      win.clearTimeout(comfortBubbleDemoTimer);
      comfortBubbleDismissed = false;
      expressionGuideDeferred = false;
      removeComfortBubble(true);
      removePhasePrompt();
      syncComfortCards();
      if (!calibrationInviteShownThisSession) hideCalibrationInvite();
      const phaseAtStart = selectedRhythm;
      comfortBubbleDemoTimer = win.setTimeout(() => {
        if (phaseAtStart === "Expression") win.__enterExpressionManuallyV6?.();
        if (trendPromptIsAvailable()) presentTrendPrompt();
        else showPhasePrompt(phaseAtStart);
      }, 550);
    }

    function scheduleExpressionComfortCard(showGuidanceHint) {
      if (!trendPromptIsAvailable()) return;
      win.clearTimeout(comfortBubbleDemoTimer);
      comfortBubbleDemoTimer = win.setTimeout(() => {
        // The base handler has switched the Start button away only while the
        // session is genuinely active. This prevents an invitation appearing after
        // an interrupted tap or after changing away from Expression.
        if (!startPumpingButton?.hidden) return;
        presentTrendPrompt();
      }, 3000);
    }

    function hideCalibrationInvite() {
      const invite = doc.getElementById("guideInvite");
      if (invite) { invite.classList.remove("is-calibration-prompt-visible"); invite.hidden = true; }
    }

    function showPumpingLog() {
      if (doc.querySelector(".mcv-log-layer-v1")) return;
      const layer = doc.createElement("section");
      layer.className = "mcv-log-layer-v1";
      layer.setAttribute("role", "dialog");
      layer.setAttribute("aria-modal", "true");
      layer.setAttribute("aria-label", "记录本次奶量");
      layer.innerHTML = `<img class="mcv-log-full-reference-v1" src="../assets/pumping-log-zero-knobless-v3.png" alt="记录奶量"><button class="mcv-log-reference-action-v1 mcv-log-reference-close-v1" type="button" aria-label="关闭记录奶量"></button><div class="mcv-log-fill-clip-v1" data-log-fill="left"><span class="mcv-log-fill-v1"></span></div><div class="mcv-log-fill-clip-v1" data-log-fill="right"><span class="mcv-log-fill-v1"></span></div><div class="mcv-log-drag-v1" data-log-drag="left" role="slider" tabindex="0" aria-label="左侧奶量" aria-valuemin="0" aria-valuemax="300"></div><div class="mcv-log-drag-v1" data-log-drag="right" role="slider" tabindex="0" aria-label="右侧奶量" aria-valuemin="0" aria-valuemax="300"></div><output class="mcv-log-value-v1" data-log-output="left">0<small>ml</small></output><output class="mcv-log-value-v1" data-log-output="right">0<small>ml</small></output><button class="mcv-log-reference-action-v1 mcv-log-reference-save-v1" type="button" aria-label="保存奶量记录" disabled></button>`;
      doc.body.appendChild(layer);
      const reference = layer.querySelector(".mcv-log-full-reference-v1");
      const referenceGeometry = {
        width: 842,
        cups: {
          // The source cups are vertically oval.  Use their actual outer
          // bounds so the white inset inherits the same ellipse geometry.
          left: { x: 55, y: 390, width: 282, height: 318 },
          right: { x: 506, y: 390, width: 282, height: 318 }
        },
        controls: {
          left: { x: 141, y: 634, size: 110 },
          right: { x: 592, y: 634, size: 110 }
        },
        values: {
          left: { x: 52, y: 783, width: 286, height: 102 },
          right: { x: 504, y: 783, width: 286, height: 102 }
        },
        close: { x: 36, y: 44, width: 96, height: 96 },
        save: { x: 52, y: 1121, width: 738, height: 115 }
      };
      let cupBoxes = {};
      let renderAmounts = () => {};
      const setReferenceBox = (element, box) => {
        element.style.left = `${box.x}px`;
        element.style.top = `${box.y}px`;
        element.style.width = `${box.width || box.size}px`;
        element.style.height = `${box.height || box.size}px`;
        element.style.right = "auto";
        element.style.bottom = "auto";
      };
      const syncReferenceGeometry = () => {
        const referenceRect = reference.getBoundingClientRect();
        const layerRect = layer.getBoundingClientRect();
        if (!referenceRect.width || !layerRect.width) return;
        const scale = referenceRect.width / referenceGeometry.width;
        const position = box => ({
          x: referenceRect.left - layerRect.left + box.x * scale,
          y: referenceRect.top - layerRect.top + box.y * scale,
          width: (box.width || box.size) * scale,
          height: (box.height || box.size) * scale
        });
        ["left", "right"].forEach(side => {
          const cup = position(referenceGeometry.cups[side]);
          cupBoxes[side] = cup;
          const inset = cup.width * .045;
          setReferenceBox(layer.querySelector(`[data-log-fill="${side}"]`), {
            x: cup.x + inset,
            y: cup.y + inset,
            width: cup.width - inset * 2,
            height: cup.height - inset * 2
          });
          setReferenceBox(layer.querySelector(`[data-log-drag="${side}"]`), position(referenceGeometry.controls[side]));
          setReferenceBox(layer.querySelector(`[data-log-output="${side}"]`), position(referenceGeometry.values[side]));
        });
        setReferenceBox(layer.querySelector(".mcv-log-reference-close-v1"), position(referenceGeometry.close));
        setReferenceBox(layer.querySelector(".mcv-log-reference-save-v1"), position(referenceGeometry.save));
        renderAmounts();
      };
      reference.addEventListener("load", syncReferenceGeometry);
      if (reference.complete) syncReferenceGeometry();
      const resizeLog = () => {
        if (!layer.isConnected) return window.removeEventListener("resize", resizeLog);
        syncReferenceGeometry();
      };
      window.addEventListener("resize", resizeLog);
      const amounts = { left: 0, right: 0 };
      renderAmounts = () => {
        const canSave = amounts.left > 0 || amounts.right > 0;
        layer.classList.toggle("has-log-adjustment", canSave);
        const saveButton = layer.querySelector(".mcv-log-reference-save-v1");
        saveButton.disabled = !canSave;
        saveButton.classList.toggle("is-enabled", canSave);
        saveButton.setAttribute("aria-disabled", String(!canSave));
        ["left", "right"].forEach(side => {
          const value = Math.round(amounts[side]);
          const drag = layer.querySelector(`[data-log-drag="${side}"]`);
          const cup = cupBoxes[side];
          if (cup) {
            const knobSize = cup.width * (110 / 282);
            const fillRatio = Math.max(0, Math.min(1, value / 300));
            const knobCenterY = cup.y + cup.height - cup.height * .04 - fillRatio * cup.height * .94;
            drag.style.left = `${cup.x + (cup.width - knobSize) / 2}px`;
            drag.style.top = `${knobCenterY - knobSize / 2}px`;
            drag.style.width = `${knobSize}px`;
            drag.style.height = `${knobSize}px`;
          }
          layer.querySelector(`[data-log-fill="${side}"]`).style.setProperty("--fill", `${Math.max(0, Math.min(100, value / 300 * 100))}%`);
          drag.setAttribute("aria-valuenow", String(value));
          layer.querySelector(`[data-log-output="${side}"]`).innerHTML = `${value}<small>ml</small>`;
        });
      };
      layer.querySelectorAll("[data-log-drag]").forEach(drag => {
        const side = drag.dataset.logDrag;
        let gesture = null;
        const update = clientY => {
          if (!gesture) return;
          amounts[side] = Math.max(0, Math.min(300, gesture.value + (gesture.startY - clientY) * 1.2));
          renderAmounts();
        };
        drag.addEventListener("pointerdown", event => {
          gesture = { startY: event.clientY, value: amounts[side] };
          drag.classList.add("is-dragging");
          drag.setPointerCapture(event.pointerId);
          event.preventDefault();
        });
        drag.addEventListener("pointermove", event => update(event.clientY));
        const finish = () => { gesture = null; drag.classList.remove("is-dragging"); };
        drag.addEventListener("pointerup", finish);
        drag.addEventListener("pointercancel", finish);
        drag.addEventListener("keydown", event => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          amounts[side] = Math.max(0, Math.min(300, amounts[side] + (event.key === "ArrowUp" ? 5 : -5)));
          renderAmounts();
        });
      });
      renderAmounts();
      layer.querySelector(".mcv-log-reference-close-v1").addEventListener("click", () => layer.remove());
      layer.querySelector(".mcv-log-reference-trash-v1")?.addEventListener("click", () => {
        amounts.left = 0;
        amounts.right = 0;
        renderAmounts();
        showComfortToast("已清空本次记录", 1800);
      });
      layer.querySelector(".mcv-log-reference-save-v1").addEventListener("click", () => {
        recordPumpingSession(amounts);
        // The trend is evaluated on save, but the considerate prompt belongs
        // to the next pumping session rather than this completed record flow.
        showPumpingLogSaved(layer);
      });
    }

    function showPumpingLogSaved(layer) {
      if (!layer?.isConnected) return;
      layer.classList.add("is-saved");
      layer.innerHTML = `<div class="mcv-log-saved-sheet-v1"><img class="mcv-log-saved-bunny-v1" src="../assets/saved-bunny-reference.png" alt=""><h2>Saved</h2><p>舒适档位已保存</p></div>`;
      win.setTimeout(() => {
        if (!layer.isConnected) return;
        layer.remove();
        showComfortToast("奶量记录已保存", 1800);
      }, 1500);
    }

    const interactionSelector = ".mcv-level-module,.mcv-mode-card,.mcv-speed-module,.mcv-control-actions,.pause-button,.hold-button";
    doc.addEventListener("pointerdown", event => {
      if (!event.target.closest(interactionSelector)) return;
      lastComfortInteractionAt = Date.now();
      removeComfortBubble(true);
    }, true);
    doc.addEventListener("keydown", event => {
      if (!event.target.closest(interactionSelector)) return;
      lastComfortInteractionAt = Date.now();
      removeComfortBubble(true);
    }, true);
    const comfortEntry = doc.getElementById("comfortEntry");
    if (comfortEntry) {
      let wasReady = comfortEntry.classList.contains("is-ready");
      new win.MutationObserver(() => {
        if (keepComfortCardVisible && comfortEntry.hidden) retainComfortCardDuringSession();
        const ready = comfortEntry.classList.contains("is-ready");
        if (!ready && wasReady) { comfortBubbleDismissed = false; removeComfortBubble(true); }
        wasReady = ready;
        syncComfortCards();
      }).observe(comfortEntry, { attributes:true, attributeFilter:["class","hidden"] });
    }

    // Keep the calibration invitation deterministic even if the base prototype
    // changes which expression state it enters automatically.
    if (typeof win.enterExpression === "function" && !win.enterExpression.__comfortBubbleWrapped) {
      const enterExpressionBase = win.enterExpression;
      const enterExpressionWithBubble = function (...args) {
        // The base prototype advances after three seconds for demo purposes.
        // Expression is a user-selected transition in this flow.
        if (!manualExpressionTransition) return;
        const result = enterExpressionBase.apply(this, args);
        win.__setSelectedRhythmV6?.("Expression");
        expressionGuideDeferred = false;
        lockOriginalLevelModuleHeight();
        syncComfortCards();
        return result;
      };
      enterExpressionWithBubble.__comfortBubbleWrapped = true;
      win.enterExpression = enterExpressionWithBubble;
      win.__enterExpressionManuallyV6 = () => {
        manualExpressionTransition = true;
        try { return win.enterExpression(); }
        finally { manualExpressionTransition = false; }
      };
    }
    const startPumpingButton = doc.getElementById("startPumping");
    if (startPumpingButton) {
      startPumpingButton.addEventListener("click", armDemoComfortBubble, true);
      // Allow the base prototype to return to its idle card only after a
      // session is actually finished, never while pumping is live.
      new win.MutationObserver(() => {
        if (!startPumpingButton.hidden) {
          calibrationInviteShownThisSession = false;
          win.__setSelectedRhythmV6?.("Stimulation");
          win.clearTimeout(comfortBubbleDemoTimer);
          removePhasePrompt();
          hideCalibrationInvite();
          showPumpingLog();
        }
      }).observe(startPumpingButton, { attributes:true, attributeFilter:["hidden"] });
    }
    ["leftLevelChip", "rightLevelChip"].forEach(id => {
      const node = doc.getElementById(id);
      if (node) new win.MutationObserver(syncComfortCards).observe(node, { childList:true, subtree:true, characterData:true, attributes:true });
    });

    function showCalibration(options = {}) {
      const existing = doc.getElementById("cnCalibrationV4");
      if (existing) return;
      retainComfortCardDuringSession();
      comfortBubbleDismissed = true;
      removeComfortBubble(true);

      const draft = safeRead(DRAFT_KEY);
      let left = draft && Number.isFinite(draft.leftLevel) ? draft.leftLevel : readLevel("left");
      let right = draft && Number.isFinite(draft.rightLevel) ? draft.rightLevel : readLevel("right");
      let side = draft && draft.side === "right" ? "right" : "left";
      let leftDone = Boolean(draft && draft.leftDone);
      let rightDone = Boolean(draft && draft.rightDone);
      let paused = false;
      let observationTimer = null;
      let upLocked = false;
      let timerInterval = null;
      let dragStartY = null;
      let lastDragLevel = null;
      let pairSaved = Boolean(leftDone && rightDone);
      let completeEscapeHandler = null;

      const style = doc.createElement("style");
      style.id = "cnCalibrationV4Style";
      style.textContent = `
        .comfort-v4{position:absolute;z-index:120;inset:calc(28% - 16px) 14px calc(16px + env(safe-area-inset-bottom));display:grid;grid-template-rows:auto auto 326px auto 1fr;gap:12px;overflow:hidden;padding:22px 18px calc(116px + env(safe-area-inset-bottom));border:1px solid rgba(255,255,255,.86);border-radius:34px;color:#3c2930;background:#fffaf7;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",Arial,sans-serif;box-shadow:0 0 0 100vmax rgba(58,35,43,.18),0 -12px 34px rgba(85,39,53,.15),0 8px 20px rgba(85,39,53,.08);animation:v4-sheet-rise .36s cubic-bezier(.2,.9,.25,1)}.comfort-v4.is-seamless{animation:none!important}
        .comfort-v4 *{box-sizing:border-box}.comfort-v4 button{min-width:44px;min-height:44px;touch-action:manipulation}.comfort-v4 button:focus-visible{outline:3px solid rgba(142,0,40,.28);outline-offset:2px}
        .v4-status{position:relative;z-index:6;width:100%;height:154px;min-height:154px;padding:14px 16px 20px;box-sizing:border-box;border-radius:30px;color:#fff;background:linear-gradient(125deg,#98012e,#bd2f55 58%,#cf627d);box-shadow:0 14px 30px rgba(113,30,57,.16)}.v4-status:after{content:\"\";position:absolute;left:50%;bottom:8px;width:108px;height:5px;border-radius:99px;background:#fff;transform:translateX(-50%)}.v4-status-top{display:grid;grid-template-columns:62px minmax(0,1fr) 24px;align-items:center;gap:12px;height:58px}.v4-status-name{display:flex;align-items:center;gap:8px;font-size:24px;line-height:1;font-weight:850}.v4-status-swap{color:#efb5c4;font-size:13px;line-height:.8}.v4-status-arrow{justify-self:end;color:#efb5c4;font-size:32px;font-weight:300}.v4-status-divider{display:block;height:1px;margin:0;background:rgba(255,255,255,.2)}.v4-status-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding-top:10px}
        .v4-device{width:62px;height:58px;border-radius:18px;position:relative;display:grid;place-items:center;overflow:hidden;background:#fff;box-shadow:inset 0 -5px 10px rgba(62,27,39,.14),0 6px 14px rgba(65,0,18,.12)}.v4-device img{display:block;width:90%;height:90%;padding:0;object-fit:contain}.v4-device.is-running:after{content:\"\";position:absolute;inset:14px;border:1px solid rgba(255,255,255,.8);border-radius:50%;animation:v4-breathe 2s ease-in-out infinite}.v4-status-copy{min-width:0}.v4-status-copy strong,.v4-status-copy span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v4-status-copy strong{font-size:22px}.v4-status-copy span{margin-top:5px;font-size:13px;color:#f8d8e1}.v4-status-copy .v4-time{display:inline;margin:0;font-style:normal}.v4-pump-controls{display:flex;align-items:center}.v4-status .v4-pause{display:grid;place-items:center;width:58px;height:48px;border:0;border-radius:22px;color:#fff;background:#870022;font-size:19px;font-weight:800}.v4-status .v4-end{display:none}
        .v4-head{position:relative;text-align:center;padding:2px 62px 0 12px}.v4-back{position:absolute;top:0;right:0;width:46px;height:46px;border-radius:50%;color:#4a343c;background:#fff;box-shadow:0 8px 18px rgba(62,27,39,.08);font-size:25px}.v4-help{position:absolute;top:50%;right:10px;display:grid;place-items:center;width:24px!important;min-width:24px!important;height:24px!important;min-height:24px!important;padding:0!important;transform:translateY(-50%);border-radius:50%;color:#6c3545;background:#fff;font-size:12px;font-weight:800;line-height:1;box-shadow:0 3px 8px rgba(62,27,39,.07)}.v4-head h2{margin:0;color:#222;font-size:20px;line-height:1.25;font-weight:600;letter-spacing:.5px}.v4-head p{margin:5px 0 0;color:#888;font-size:13px;font-weight:400}.v4-progress{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}.v4-progress i{height:4px;border-radius:99px;background:#eadde1}.v4-progress i.is-complete,.v4-progress i.is-active{background:#b82e54}
        .v4-sides{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v4-side{height:42px;border:1px solid #e4d9dc;border-radius:999px;color:#444;background:#f7f2f3;font-size:14px;font-weight:400}.v4-side.is-active{color:#fff;border-color:#92002c;background:#92002c;font-weight:600}.v4-side.is-done{color:#8e0028;background:#fff;font-weight:600}.v4-side:disabled{cursor:not-allowed;opacity:.52}
        .v4-adjust{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);grid-template-rows:1fr;align-items:center;column-gap:12px;width:min(100%,320px);justify-self:center;min-height:0;padding:10px 0 42px}.v4-control-stack{grid-column:2;grid-row:1;justify-self:stretch;align-self:center;display:flex;flex-direction:column;justify-content:space-between;height:184px;min-width:0}.v4-control-row{display:grid;grid-template-columns:46px minmax(0,1fr);align-items:center;gap:7px;min-width:0}.v4-control-row span{color:#999;font-size:12px;font-weight:400;line-height:1.3;text-align:left}.v4-step{width:46px;height:46px;border-radius:50%;color:#96002d;background:#fce6eb;font-size:24px;box-shadow:0 7px 16px rgba(104,0,31,.07)}.v4-step:disabled{color:#b9afb2;background:#f0ebec;box-shadow:none}
        .v4-rail-wrap{grid-column:1;grid-row:1;justify-self:center;align-self:center;display:grid;place-items:center;min-height:0}.v4-rail{position:relative;width:126px;height:224px;touch-action:none;cursor:ns-resize}.v4-rail:before{content:"";position:absolute;top:10px;bottom:10px;left:50%;width:58px;border-radius:32px;background:linear-gradient(#f8eff1,#f2edef);transform:translateX(-50%)}.v4-ticks{position:absolute;inset:18px 0;display:flex;flex-direction:column-reverse;justify-content:space-between;align-items:center}.v4-ticks i{display:block;width:38px;height:3px;border-radius:99px;background:#e7cad2}.v4-ticks i:nth-child(n+6){background:#d69aaa}.v4-ticks i:nth-child(n+11){background:#ba536f}
        .v4-marker{position:absolute;left:50%;bottom:0;display:grid;place-items:center;width:108px;height:52px;border-radius:999px;color:#fff;background:linear-gradient(135deg,#92002d,#ca5370);font-size:24px;font-weight:700;transform:translate(-50%,50%);box-shadow:0 10px 22px rgba(128,8,46,.2);transition:bottom .22s ease;touch-action:none}.v4-observe{display:none}
        .v4-reference{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;min-height:36px;margin-top:8px;padding:8px 48px 8px 14px;border-radius:14px;color:#555;background:#f5eef0;font-size:13px;font-weight:400;text-align:center}.v4-reference strong{color:#555;margin-right:4px;font-weight:600}
        .v4-actions{position:absolute;z-index:3;left:18px;right:18px;bottom:calc(14px + env(safe-area-inset-bottom));display:grid;gap:6px;padding:14px 0 0;background:linear-gradient(180deg,rgba(255,250,247,0),#fffaf7 22px)}.v4-question{margin:0;text-align:center;color:#333;font-size:16px;line-height:1.25;font-weight:600}.v4-hint{text-align:center;color:#999;font-size:12px;font-weight:400;line-height:1.35}.v4-save{width:100%;height:58px;border-radius:999px;color:#fff;background:linear-gradient(120deg,#93002d,#ca5270);font-size:14px;font-weight:800;box-shadow:0 10px 22px rgba(123,0,38,.16)}.v4-save:disabled{color:#fff;background:#dba5b2;box-shadow:none}
        .comfort-v4.is-paused .v4-adjust,.comfort-v4.is-paused .v4-save{pointer-events:none;opacity:.44}.comfort-v4.is-paused .v4-device:after{animation-play-state:paused}
        .v4-modal{position:absolute;z-index:4;inset:0;display:grid;place-items:center;padding:24px;background:rgba(48,31,38,.32);backdrop-filter:blur(4px)}.v4-modal-card{width:100%;max-width:340px;padding:22px;border-radius:26px;text-align:center;background:#fffdfa;box-shadow:0 24px 60px rgba(57,30,40,.22)}.v4-modal-card h3{margin:0;font-size:18px}.v4-modal-card p{margin:8px 0 16px;color:#897d82;font-size:11px;line-height:1.55}.v4-modal-card button{width:100%;height:46px;margin-top:8px;border-radius:999px;font-size:12px;font-weight:800}.v4-primary{color:#fff;background:#90002b}.v4-secondary{color:#8e0028;border:1px solid #e5cbd2;background:#fff}.v4-tertiary{color:#75686d;background:transparent}
        .v4-help-layer{position:absolute;z-index:7;inset:0;display:grid;place-items:center;padding:20px;background:rgba(48,31,38,.28);backdrop-filter:blur(4px)}.v4-help-card{position:relative;width:100%;max-width:336px;padding:24px 20px 20px;border-radius:28px;background:#fffaf7;box-shadow:0 22px 54px rgba(57,30,40,.22)}.v4-help-card h3{margin:0 44px 6px 0;color:#35242a;font-size:18px}.v4-help-card>p{margin:0 44px 16px 0;color:#94868b;font-size:11px;line-height:1.5}.v4-help-close{position:absolute;right:16px;top:15px;width:40px;height:40px;border-radius:50%;color:#6f1731;background:#fff;font-size:21px;box-shadow:0 6px 16px rgba(82,33,47,.08)}.v4-help-list{display:grid;gap:10px}.v4-help-item{display:grid;grid-template-columns:36px minmax(0,1fr);align-items:center;gap:10px;padding:12px;border-radius:18px;background:#f8eff1}.v4-help-item b{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;color:#8e0028;background:#fce1e8;font-size:16px}.v4-help-item strong{display:block;color:#6d2438;font-size:12px}.v4-help-item span{display:block;margin-top:3px;color:#8d7e83;font-size:10px;line-height:1.4}.v4-help-ok{width:100%;height:46px;margin-top:16px;border-radius:999px;color:#fff;background:linear-gradient(120deg,#93002d,#ca5270);font-size:12px;font-weight:800}
        .v4-toast{position:absolute;z-index:5;top:44%;left:50%;padding:9px 14px;border-radius:999px;color:#fff;background:rgba(62,39,47,.88);font-size:11px;opacity:0;pointer-events:none;transform:translate(-50%,-6px);transition:.18s}.v4-toast.is-visible{opacity:1;transform:translate(-50%,0)}
        .v4-complete-layer{position:absolute;z-index:160;inset:0;display:flex;align-items:flex-end;justify-content:center;padding:0;background:rgba(54,33,41,.16);animation:v4-fade-in .18s ease}.v4-complete-sheet{position:relative;width:100%;min-height:72%;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;padding:42px 28px calc(44px + env(safe-area-inset-bottom));overflow:hidden;border-radius:42px 42px 0 0;text-align:center;background:#fff8f4;box-shadow:0 -8px 24px rgba(78,27,46,.10);animation:v4-saved-up .36s cubic-bezier(.2,.9,.25,1)}.v4-complete-sheet:before{display:none}.v4-saved-bunny{position:relative;z-index:1;width:182px;height:148px;margin:0 auto 22px;object-fit:cover;object-position:center;mix-blend-mode:normal}.v4-complete-sheet h3{position:relative;z-index:1;margin:0;color:#8d002b;font-family:"Snell Roundhand","Segoe Script","Bradley Hand",cursive;font-size:54px;line-height:1;font-weight:700;letter-spacing:.2px}.v4-complete-sheet h3:after{content:"";display:block;width:170px;height:20px;margin:2px auto 10px;border-bottom:3px solid #8d002b;border-radius:50%;transform:rotate(-2deg)}.v4-complete-sheet p{position:relative;z-index:1;margin:0;color:#8d7b80;font-size:14px;line-height:1.5}.v4-complete-mark,.v4-complete-levels,.v4-complete-actions{display:none}@keyframes v4-saved-up{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}

        .v4-result{grid-column:1/-1;align-self:center;padding:28px 20px;border-radius:28px;text-align:center;background:#fff;box-shadow:0 18px 44px rgba(68,34,45,.12)}.v4-result h2{margin:0;font-size:22px}.v4-result-levels{margin:18px 0 8px;color:#850027;font-size:28px;font-weight:850}.v4-result p{margin:0 0 18px;color:#85787d;font-size:11px;line-height:1.55}
        .comfort-v4.is-result{display:grid;place-items:center;padding:24px}.comfort-v4.is-result .v4-result{grid-column:auto;width:100%;max-width:340px;align-self:auto}.v4-save:active{transform:scale(.985);filter:brightness(.97)}
        @keyframes v4-breathe{0%,100%{opacity:.2;transform:scale(.85)}50%{opacity:.8;transform:scale(1.25)}}@keyframes v4-fade-in{from{opacity:0}to{opacity:1}}@keyframes v4-sheet-rise{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
        @media (max-height:760px){.comfort-v4{inset:calc(28% - 10px) 10px calc(10px + env(safe-area-inset-bottom));grid-template-rows:auto auto 292px auto 1fr;gap:8px;padding-top:16px;padding-bottom:108px;border-radius:28px}.v4-adjust{padding-top:4px}.v4-rail{height:196px}.v4-head h2{font-size:20px}.v4-actions{bottom:calc(10px + env(safe-area-inset-bottom))}.v4-save{height:54px}}
        @media (prefers-reduced-motion:reduce){.comfort-v4 *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
      `;
      doc.head.appendChild(style);
      style.textContent += "\n.v4-complete-layer{background:none!important}.v4-complete-sheet{min-height:100%!important;height:100%!important;border-radius:34px!important;box-shadow:none!important}\n.v4-reference{transform:translateY(-54px)!important}\n@media(max-height:760px){.v4-reference{transform:translateY(-36px)!important}}";
      style.textContent += "\n.v4-reference .v4-help{box-sizing:border-box!important;width:20px!important;min-width:20px!important;max-width:20px!important;height:20px!important;min-height:20px!important;max-height:20px!important;margin:0!important;padding:0!important;border:1px solid #eadde1!important;border-radius:50%!important;background:rgba(255,255,255,.74)!important;font-size:11px!important;line-height:20px!important;box-shadow:none!important}";

      const page = doc.createElement("section");
      page.id = "cnCalibrationV4";
      page.className = "comfort-v4" + (options.seamless ? " is-seamless" : "");
      page.setAttribute("role", "dialog");
      page.setAttribute("aria-modal", "true");
      page.setAttribute("aria-labelledby", "v4Title");
      page.innerHTML = `
        <header class="v4-head">
          <button class="v4-back" aria-label="退出舒适档位设置">×</button>
          <h2 id="v4Title">寻找舒适档位</h2>
          <p class="v4-subtitle"></p>
          <span class="v4-progress" aria-label="设置进度"><i></i><i></i></span>
        </header>
        <nav class="v4-sides" aria-label="左右侧设置状态">
          <button class="v4-side" data-side="left"></button>
          <button class="v4-side" data-side="right"></button>
        </nav>
        <main class="v4-adjust">
          <div class="v4-control-stack" aria-label="档位快捷调节">
            <div class="v4-control-row"><button class="v4-step v4-plus" aria-label="升高一档">+</button><span>逐级慢加<br>先感受再调</span></div>
            <div class="v4-control-row"><button class="v4-step v4-minus" aria-label="降低一档">−</button><span>不舒服就降<br>舒适优先</span></div>
          </div>
          <div class="v4-rail-wrap">
            <div class="v4-rail" role="slider" aria-label="当前侧吸力档位" aria-valuemin="1" aria-valuemax="${MAX_LEVEL}" tabindex="0">
              <span class="v4-ticks" aria-hidden="true">${"<i></i>".repeat(MAX_LEVEL)}</span>
              <b class="v4-marker"></b>
            </div>
            <span class="v4-observe" role="status">可调节或确认当前档位</span>
          </div>
        </main>
        <div class="v4-reference"><strong>舒适参考：</strong>有拉扯感，无刺痛、无不适感<button class="v4-help" aria-label="查看舒适档位帮助">?</button></div>
        <footer class="v4-actions">
          <strong class="v4-question">这个档位感觉如何？</strong>
          <span class="v4-hint">建议感受 2–3 个吸乳节奏后再确认</span>
          <button class="v4-save"></button>
        </footer>
        <span class="v4-toast" role="status" aria-live="polite"></span>
      `;
      doc.body.appendChild(page);

      const marker = page.querySelector(".v4-marker");
      const rail = page.querySelector(".v4-rail");
      const minus = page.querySelector(".v4-minus");
      const plus = page.querySelector(".v4-plus");
      const save = page.querySelector(".v4-save");
      const observe = page.querySelector(".v4-observe");
      const subtitle = page.querySelector(".v4-subtitle");
      const sideButtons = [...page.querySelectorAll(".v4-side")];
      const toast = page.querySelector(".v4-toast");

      function showCalibrationHelp() {
        if (page.querySelector(".v4-help-layer")) return;
        const layer = doc.createElement("section");
        layer.className = "v4-help-layer";
        layer.innerHTML = `<div class="v4-help-card" role="dialog" aria-modal="true" aria-labelledby="v4HelpTitle"><button class="v4-help-close" type="button" aria-label="关闭帮助">×</button><h3 id="v4HelpTitle">怎样找到舒适档位</h3><p>吸乳继续运行，当前设置进度不会丢失。</p><div class="v4-help-list"><div class="v4-help-item"><b>1</b><div><strong>有力度，但不疼</strong><span>有牵拉感即可，不应刺痛或夹痛。</span></div></div><div class="v4-help-item"><b>2</b><div><strong>不是越高越好</strong><span>以身体能够放松承受为准。</span></div></div><div class="v4-help-item"><b>3</b><div><strong>逐级慢调</strong><span>每次只升一档；不适立即降低。</span></div></div></div><button class="v4-help-ok" type="button">知道了</button></div>`;
        page.appendChild(layer);
        const closeHelp = () => layer.remove();
        layer.querySelector(".v4-help-close").addEventListener("click", closeHelp);
        layer.querySelector(".v4-help-ok").addEventListener("click", closeHelp);
        layer.addEventListener("click", event => { if (event.target === layer) closeHelp(); });
        layer.querySelector(".v4-help-close").focus();
      }

      page.querySelector(".v4-help").addEventListener("click", showCalibrationHelp);

      function level() { return side === "left" ? left : right; }
      function currentName() { return side === "left" ? "左侧" : "右侧"; }
      function setLevel(value, source) {
        const next = Math.max(1, Math.min(MAX_LEVEL, Math.round(value)));
        const previous = level();
        if (next === previous) return;
        if (side === "left") left = next; else right = next;
        if (side === "left") leftDone = false; else rightDone = false;
        setPumpLevel(side, next);
        buzz(8);
        if (next > previous && source !== "restore") showObservationHint();
        else if (next < previous) clearObservation("已降低，可继续调整或确认");
        render();
      }

      function flash(text) {
        toast.textContent = text;
        toast.classList.add("is-visible");
        win.setTimeout(() => toast.classList.remove("is-visible"), 1500);
      }

      function clearObservation(text) {
        win.clearTimeout(observationTimer);
        observationTimer = null;
        observe.textContent = text || "可调节或确认当前档位";
        observe.classList.remove("is-waiting");
      }

      function showObservationHint() {
        win.clearTimeout(observationTimer);
        observe.textContent = "建议感受 2–3 个吸乳节奏";
        observe.classList.add("is-waiting");
        observationTimer = win.setTimeout(() => {
          clearObservation("可继续调整或确认当前档位");
        }, 2600);
      }

      function render() {
        const value = level();
        marker.textContent = value + " / " + MAX_LEVEL;
        marker.style.bottom = "calc(" + ((value - 1) / (MAX_LEVEL - 1) * 100) + "% - " + ((value - 1) / (MAX_LEVEL - 1) * 52) + "px)";
        rail.setAttribute("aria-valuenow", String(value));
        rail.setAttribute("aria-valuetext", currentName() + value + "档");
        minus.disabled = paused || value === 1;
        plus.disabled = paused || value === MAX_LEVEL;
        plus.setAttribute("aria-disabled", String(paused || value === MAX_LEVEL || upLocked));
        save.disabled = paused;
        save.textContent = side === "left" ? "确认使用左侧 " + left + " 档" : "确认使用右侧 " + right + " 档";
        subtitle.textContent = side === "left" ? "第 1 步 / 2 · 正在设置左侧" : "第 2 步 / 2 · 正在设置右侧";
        sideButtons[0].textContent = leftDone ? "左侧 · 已完成 ✓" : side === "left" ? "左侧 · 设置中" : "左侧 · 待设置";
        sideButtons[1].textContent = rightDone ? "右侧 · 已完成 ✓" : side === "right" ? "右侧 · 设置中" : "右侧 · 待设置";
        sideButtons[0].className = "v4-side" + (side === "left" ? " is-active" : leftDone ? " is-done" : "");
        sideButtons[1].className = "v4-side" + (side === "right" ? " is-active" : rightDone ? " is-done" : "");
        sideButtons[0].disabled = false;
        sideButtons[1].disabled = !leftDone && side !== "right";
        const progress = page.querySelectorAll(".v4-progress i");
        progress[0].className = leftDone ? "is-complete" : side === "left" ? "is-active" : "";
        progress[1].className = rightDone ? "is-complete" : side === "right" ? "is-active" : "";
      }

      function switchSide(next) {
        if (next === "right" && !leftDone) { flash("请先确认左侧档位"); return; }
        clearObservation();
        side = next;
        setPumpLevel(side, level());
        render();
        flash(next === "left" ? "已返回修改左侧" : "正在设置右侧");
      }

      function profile() {
        return {
          deviceId: "mobile-flow",
          phase: "expression",
          leftLevel: left,
          rightLevel: right,
          status: "candidate",
          comfortableConfirmations: 0,
          lastValidatedAt: new Date().toISOString(),
          version: 2
        };
      }

function finishSave() {
  const resultProfile = profile();
  // Calibration changes are live device values; saving must not pause or
  // reset the running pumping session.
  setPumpLevel("left", resultProfile.leftLevel);
  setPumpLevel("right", resultProfile.rightLevel);
  safeWrite(PROFILE_KEY, resultProfile);
  syncComfortPlaceholder();
  safeRemove(DRAFT_KEY);
  win.clearTimeout(observationTimer);
  pairSaved = true;
  page.querySelector(".v4-complete-layer")?.remove();
  if (completeEscapeHandler) win.removeEventListener("keydown", completeEscapeHandler);
  render();
  const layer = doc.createElement("section");
  layer.className = "v4-complete-layer";
  layer.setAttribute("role", "status");
  layer.setAttribute("aria-live", "polite");
  layer.innerHTML = `<div class="v4-complete-sheet"><img class="v4-saved-bunny" src="../assets/saved-bunny-reference.png" alt="" aria-hidden="true"><h3>Saved</h3><p>舒适档位已保存</p></div>`;
  page.appendChild(layer);
  try { if (typeof win.updateProfileUi === "function") win.updateProfileUi(); } catch (_) {}
  win.setTimeout(() => {
    if (!layer.isConnected) return;
    layer.remove();
    closeCalibration(false);
    setPumpLevel("left", resultProfile.leftLevel);
    setPumpLevel("right", resultProfile.rightLevel);
    syncComfortCards();
    if (typeof win.showToast === "function") win.showToast("舒适档位已保存");
  }, 1500);
}
      function closeCalibration(syncBase = true) {
        win.clearInterval(timerInterval);
        win.clearTimeout(observationTimer);
        if (completeEscapeHandler) win.removeEventListener("keydown", completeEscapeHandler);
        page.remove();
        style.remove();
        if (syncBase) {
          const secondary = doc.getElementById("keepCurrent");
          if (secondary) secondary.click();
        }
      }

      function modal(title, copy, buttons) {
        const overlay = doc.createElement("div");
        overlay.className = "v4-modal";
        overlay.innerHTML = `<div class="v4-modal-card"><h3>${title}</h3><p>${copy}</p></div>`;
        const card = overlay.firstElementChild;
        buttons.forEach((item) => {
          const button = doc.createElement("button");
          button.className = item.className;
          button.textContent = item.label;
          button.addEventListener("click", () => item.action(overlay));
          card.appendChild(button);
        });
        page.appendChild(overlay);
        card.querySelector("button").focus();
      }

      minus.addEventListener("click", () => {
        if (level() === 1) { flash("已达最低档位"); return; }
        setLevel(level() - 1, "minus");
      });
      plus.addEventListener("click", () => {
        if (level() === MAX_LEVEL) { flash("已达最高档位"); return; }
        if (upLocked) { flash("请先感受当前档位"); return; }
        setLevel(level() + 1, "plus");
        upLocked = true;
        win.setTimeout(() => { upLocked = false; render(); }, 1500);
      });
      sideButtons.forEach((button) => button.addEventListener("click", () => switchSide(button.dataset.side)));
      save.addEventListener("click", () => {
        try {
          buzz([8, 20, 8]);
          if (pairSaved) {
            if (side === "left") leftDone = true; else rightDone = true;
            if (leftDone && rightDone) finishSave();
            return;
          }
          if (side === "left") {
            leftDone = true;
            side = "right";
            right = 1;
            setPumpLevel("right", right);
            clearObservation();
            render();
            flash("左侧已保存，开始设置右侧");
          } else {
            rightDone = true;
            finishSave();
          }
        } catch (_) {
          flash("操作未完成，请再试一次");
        }
      });

      function levelFromPointer(event) {
        const rect = rail.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (rect.bottom - event.clientY) / rect.height));
        return 1 + Math.round(ratio * (MAX_LEVEL - 1));
      }
      marker.addEventListener("pointerdown", (event) => {
        dragStartY = event.clientY;
        lastDragLevel = level();
        marker.setPointerCapture(event.pointerId);
      });
      marker.addEventListener("pointermove", (event) => {
        if (dragStartY === null || !marker.hasPointerCapture(event.pointerId)) return;
        const next = levelFromPointer(event);
        if (next === lastDragLevel) return;
        lastDragLevel = next;
        setLevel(next, "drag");
      });
      const endDrag = () => { dragStartY = null; lastDragLevel = null; };
      marker.addEventListener("pointerup", endDrag);
      marker.addEventListener("pointercancel", endDrag);
      rail.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        if (event.key === "ArrowDown") minus.click(); else plus.click();
      });

      page.querySelector(".v4-back").addEventListener("click", () => {
        modal("退出舒适档位设置？", "吸乳全程不中断，已自动保存当前进度，稍后可继续完成", [
          { label: "确认退出", className: "v4-primary", action: () => { safeWrite(DRAFT_KEY, { leftLevel:left, rightLevel:right, side, leftDone, rightDone, savedAt:new Date().toISOString() }); syncComfortCards(); closeCalibration(); } },
          { label: "继续设置", className: "v4-secondary", action: (overlay) => overlay.remove() }
        ]);
      });

      setPumpLevel(side, level());
      render();
      page.querySelector(".v4-back").focus();
      if (draft) flash("已恢复上次未完成的设置");
    }

    win.__showCalibrationV4 = showCalibration;
  }

  const frame = document.getElementById("currentFrame");
  if (!frame) return;
  frame.addEventListener("load", () => install(frame));
  if (frame.contentDocument && frame.contentDocument.readyState === "complete") install(frame);
})();
