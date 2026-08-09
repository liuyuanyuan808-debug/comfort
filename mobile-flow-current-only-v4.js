(function () {
  const PROFILE_KEY = "mobileFlowComfortProfileV2";
  const DRAFT_KEY = "mobileFlowComfortDraftV3";
  const MAX_LEVEL = 15;

  function install(frame) {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win || win.__comfortV4Installed) return;
    win.__comfortV4Installed = true;
    let syncComfortPlaceholder = function () {};

    const surfaceStyle = doc.createElement("style");
    surfaceStyle.id = "comfortSurfaceV4";
    surfaceStyle.textContent = `
      html,body{margin:0!important;background:#fffaf7!important}
      .app-shell{min-height:100svh!important;padding:0!important;background:#fffaf7!important}
      .phone{width:100%!important;max-width:none!important;height:100svh!important;min-height:100svh!important;margin-left:0!important;border-radius:44px!important;background:#fffaf7!important;box-shadow:none!important}
      /* One continuous control surface: no enlarged/cropped reference image and no edge patches. */
      .control-reference-page{--mcv-inner-left:0px!important;--mcv-inner-right:0px!important;--mcv-card-left:6%!important;--mcv-card-right:6%!important;overflow:hidden!important;background:#fbf8f4!important}
      .mcv-inner-surface{inset:0!important;border-radius:44px!important;overflow:hidden!important;background:#fbf8f4!important}
      .control-reference-page .control-reference-image{display:none!important}
      .mcv-native-head-v4{position:absolute;z-index:3;inset:0 0 auto;height:31.2%;overflow:hidden;color:#2d1d24;background:#fbf8f4;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",Arial,sans-serif}
      .mcv-native-status-v4{height:52px;padding:19px 7% 0;display:flex;align-items:center;justify-content:space-between;font-size:17px;font-weight:800}
      .mcv-native-system-v4{display:flex;align-items:center;gap:8px}
      .mcv-native-signal-v4{display:flex;align-items:flex-end;gap:2px;height:14px}.mcv-native-signal-v4 i{display:block;width:3px;border-radius:2px;background:#2d1d24}.mcv-native-signal-v4 i:nth-child(1){height:5px}.mcv-native-signal-v4 i:nth-child(2){height:8px}.mcv-native-signal-v4 i:nth-child(3){height:11px}.mcv-native-signal-v4 i:nth-child(4){height:14px}
      .mcv-native-wifi-v4{position:relative;width:18px;height:13px;border-top:3px solid #2d1d24;border-radius:50%}.mcv-native-wifi-v4::before{content:"";position:absolute;left:4px;top:2px;width:8px;height:7px;border-top:3px solid #2d1d24;border-radius:50%}.mcv-native-wifi-v4::after{content:"";position:absolute;left:7px;top:7px;width:4px;height:4px;border-radius:50%;background:#2d1d24}
      .mcv-native-battery-v4{position:relative;width:24px;height:12px;border:2px solid #2d1d24;border-radius:4px}.mcv-native-battery-v4::before{content:"";position:absolute;inset:2px;border-radius:2px;background:#2d1d24}.mcv-native-battery-v4::after{content:"";position:absolute;right:-4px;top:3px;width:2px;height:4px;border-radius:0 2px 2px 0;background:#2d1d24}
      .mcv-native-nav-v4{height:72px;padding:5px 6% 8px;display:grid;grid-template-columns:48px minmax(0,1fr) 96px;align-items:center}.mcv-native-nav-v4 h2{margin:0;text-align:center;font-size:18px;font-weight:650;letter-spacing:.2px}
      .mcv-native-icon-button-v4{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;color:#2d1d24;background:rgba(255,255,255,.84);box-shadow:0 8px 24px rgba(88,53,63,.06)}.mcv-native-back-v4{font-size:32px;font-weight:300;line-height:1;transform:translateY(-1px)}
      .mcv-native-tools-v4{justify-self:end;display:flex;width:96px;height:48px;align-items:center;justify-content:space-evenly;border-radius:26px;background:rgba(255,255,255,.84);box-shadow:0 8px 24px rgba(88,53,63,.06)}.mcv-native-tools-v4 button{display:grid;place-items:center;width:42px;height:42px;color:#2d1d24;background:transparent}.mcv-native-help-v4{font-size:22px;font-weight:700}.mcv-native-gear-v4{font-size:27px;line-height:1}
      .mcv-native-device-v4{position:absolute;left:6%;right:6%;top:118px;bottom:36px;display:grid;place-items:center;overflow:visible}.mcv-native-device-v4 img{display:block;width:min(64%,244px);max-height:100%;height:auto;object-fit:contain;object-position:center;filter:drop-shadow(0 10px 12px rgba(83,58,62,.10))}
      .mcv-content-scrim{inset:30.6% 0 0!important;background:#f9f7f5!important}
      .mcv-page-content{left:6%!important;right:6%!important;background:#f9f7f5!important}
      .mcv-mode-card,.mcv-level-module,.mcv-speed-module{width:100%!important;border-radius:24px!important}
      .mcv-control-panel{display:flex!important;flex-direction:column!important;grid-template-rows:none!important;gap:12px!important;overflow:visible!important}
      .mcv-level-module{flex:1 1 auto!important;min-height:0!important;border-radius:24px!important;background:#fff!important;box-shadow:0 10px 28px rgba(82,54,63,.055)!important}
      .mcv-level-module .mcv-level-visual{inset:16px 24px!important}
      .mcv-level-module .reference-level-zone{bottom:16px!important}
      .mcv-speed-module{flex:0 0 96px!important}
      .mcv-bottom-shell{left:0!important;right:0!important;width:100%!important;padding-left:6%!important;padding-right:6%!important;background:#fbf8f4!important}
      .mcv-control-actions{width:100%!important;gap:16px!important;background:transparent!important}
      .mcv-control-actions::before{display:none!important}
      .mcv-control-actions .hold-button{min-width:0!important}
      .mcv-control-actions .pause-button{flex:0 0 56px!important}
      .mcv-guide-invite.cn-comfort-invite{left:6%!important;right:6%!important;width:auto!important;max-width:none!important;padding:20px!important;border-radius:28px!important;overflow:hidden!important}
      .cn-comfort-invite .mcv-invite-header{text-align:center!important}
      .cn-comfort-invite h3{text-align:center!important;margin:0!important}
      .cn-comfort-invite .mcv-invite-copy{text-align:center!important}
      .cn-comfort-invite .cn-guide-video{width:100%!important;height:auto!important;aspect-ratio:16/9!important;margin:16px 0 0!important;border-radius:20px!important}
      .cn-comfort-invite .cn-guide-note{text-align:center!important;margin-top:12px!important}
      .cn-comfort-invite .mcv-invite-actions{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important;margin-top:14px!important}
      .cn-comfort-invite .mcv-invite-actions>button{width:100%!important;min-width:0!important;height:44px!important}
      .mcv-comfort-entry.mcv-comfort-entry-v4{position:relative!important;inset:auto!important;left:auto!important;right:auto!important;bottom:auto!important;flex:0 0 92px!important;width:100%!important;max-width:none!important;height:92px!important;padding:12px 16px!important;display:grid!important;grid-template-columns:minmax(0,7fr) minmax(88px,3fr)!important;grid-template-rows:1fr!important;align-items:center!important;gap:12px!important;border:0!important;border-radius:24px!important;background:#fff!important;box-shadow:0 10px 28px rgba(82,54,63,.055)!important;overflow:hidden!important}
      .mcv-comfort-entry.mcv-comfort-entry-v4[hidden]{display:none!important}
      .mcv-comfort-placeholder.mcv-comfort-card-v4{position:relative!important;inset:auto!important;left:auto!important;right:auto!important;bottom:auto!important;flex:0 0 92px!important;width:100%!important;max-width:none!important;height:92px!important;padding:12px 16px!important;border:0!important;border-radius:24px!important;background:#fff!important;box-shadow:0 10px 28px rgba(82,54,63,.055)!important}
      .mcv-comfort-placeholder-v4{display:grid!important;grid-template-columns:minmax(0,7fr) minmax(88px,3fr)!important;align-items:center!important;gap:12px!important}
      .mcv-comfort-status-v4{display:inline-flex;align-items:center;min-height:20px;padding:3px 9px;border-radius:999px;color:#7c1733;background:#f8e3e9;font-size:10px;font-weight:800;line-height:1}
      .mcv-comfort-summary-v4{color:#92878c;font-size:11px;font-weight:600}
      .mcv-comfort-review-v4{width:100%;min-height:32px;padding:0 8px;text-align:right;color:#7d1230;background:transparent;font-size:11px;font-weight:800}
      .mcv-comfort-placeholder.mcv-comfort-card-v4[hidden]{display:none!important}
      .mcv-comfort-info-v4{position:relative;z-index:2;display:flex;min-width:0;flex-direction:column;justify-content:center;gap:7px;pointer-events:none}
      .mcv-comfort-info-v4 .mcv-comfort-heading,.mcv-comfort-info-v4 .mcv-comfort-main{position:static!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;min-width:0}
      .mcv-comfort-info-v4 .mcv-comfort-title{font-weight:800!important}
      .mcv-comfort-ops-v4{position:relative;z-index:4;display:grid;grid-template-rows:32px 44px;align-items:center;gap:4px;min-width:0}
      .mcv-comfort-entry-v4 .mcv-comfort-action{position:static!important;width:100%!important;min-width:0!important;min-height:32px!important;padding:0 8px!important;text-align:right!important;transform:none!important;background:transparent!important}
      .mcv-comfort-entry-v4 .mcv-comfort-action:active{transform:scale(.97)!important}
      .mcv-comfort-apply-v4{position:relative;z-index:0;justify-self:end;width:80px;height:44px;min-width:0;border-radius:14px;color:#fff;background:transparent;font-size:9.5px;font-weight:800;box-shadow:none;transition:transform .14s ease,filter .14s ease}
      .mcv-comfort-apply-v4::before{content:"";position:absolute;z-index:-1;inset:4px;border-radius:12px;background:#8e0028;box-shadow:0 5px 12px rgba(142,0,40,.14)}
      .mcv-comfort-apply-v4:active{transform:scale(.97);filter:brightness(.96)}
      .mcv-comfort-apply-v4:disabled{color:#a89fa2;opacity:1;box-shadow:none;cursor:default}
      .mcv-comfort-apply-v4:disabled::before{background:#eee9eb;box-shadow:none}
      @media (prefers-reduced-motion:reduce){.mcv-comfort-apply-v4{transition:none!important}}
    `;
    doc.head.appendChild(surfaceStyle);

    const precheckStyle = doc.createElement("style");
    precheckStyle.id = "precheckUnifiedV4";
    precheckStyle.textContent = ".cn-precheck{padding:14px 18px calc(18px + env(safe-area-inset-bottom))!important;background:#fbf7f3!important}\n.cn-precheck-status-v4{position:relative;width:100%;height:154px;flex:0 0 154px;display:grid;grid-template-columns:62px minmax(0,1fr) 62px;grid-template-rows:58px 1px 1fr;column-gap:12px;align-items:center;padding:14px 16px 20px;box-sizing:border-box;border-radius:30px;color:#fff;background:linear-gradient(125deg,#98012e,#bd2f55 58%,#cf627d);box-shadow:0 14px 30px rgba(113,30,57,.16)}.cn-precheck-status-v4:after{content:\"\";position:absolute;left:50%;bottom:8px;width:108px;height:5px;border-radius:99px;background:#fff;transform:translateX(-50%)}\n.cn-precheck-device-v4{grid-column:1;grid-row:1;display:grid;place-items:center;width:62px;height:58px;border-radius:18px;background:#fff;overflow:hidden}.cn-precheck-device-v4 img{display:block;width:90%;height:90%;object-fit:contain}\n.cn-precheck-product-v4{grid-column:2;grid-row:1;display:flex;align-items:center;gap:8px;min-width:0}.cn-precheck-product-v4 strong{font-size:24px;line-height:1}.cn-precheck-swap-v4{font-size:13px;line-height:.8;color:#efb5c4}\n.cn-precheck-chevron-v4{grid-column:3;grid-row:1;justify-self:end;font-size:32px;font-weight:300;color:#efb5c4}\n.cn-precheck-divider-v4{grid-column:1/4;grid-row:2;width:100%;height:1px;background:rgba(255,255,255,.2)}\n.cn-precheck-program-v4{grid-column:1/3;grid-row:3;align-self:end;display:flex;flex-direction:column;gap:5px}.cn-precheck-program-v4 strong{font-size:22px}.cn-precheck-program-v4 span{font-size:13px;color:#f8d8e1}\n.cn-precheck-play-v4{grid-column:3;grid-row:3;align-self:end;justify-self:end;width:58px;height:48px;border:0;border-radius:22px;color:#fff;background:#870022;font-size:19px;box-shadow:none}\n.cn-precheck-header{padding:16px 50px 12px!important}.cn-precheck-back{top:9px!important;width:46px!important;height:46px!important}.cn-precheck h2{font-size:20px!important;font-weight:650!important;letter-spacing:.5px!important}.cn-precheck-header p{margin-top:6px!important;font-size:12px!important}\n.cn-precheck-scroll{flex:1!important;min-height:0!important;gap:14px!important;padding:4px 5px 12px!important;margin:0!important;scroll-padding-inline:5px!important}\n.cn-check-card{flex:0 0 100%!important;min-height:220px!important;border-radius:28px!important;padding:24px!important;gap:20px!important;box-shadow:0 12px 30px rgba(82,54,63,.07)!important}.cn-check-card svg{width:108px!important;height:108px!important}.cn-check-card p{font-size:15px!important}\n.cn-precheck-dots{margin:0 0 13px!important}.cn-precheck-actions{margin-top:0!important;gap:12px!important}.cn-precheck-actions button{height:50px!important;border-radius:25px!important}\n@media(max-height:720px){.cn-precheck-status-v4{height:136px;flex-basis:136px}.cn-check-card{min-height:190px}.cn-check-card svg{width:90px!important;height:90px!important}}";
doc.head.appendChild(precheckStyle);
precheckStyle.textContent += "\n.cn-precheck-scroll{flex:0 0 auto!important;min-height:auto!important;margin:0 -18px!important;padding:6px 34px 14px!important;gap:14px!important;scroll-padding-inline:34px!important;scroll-behavior:smooth!important}\n.cn-check-card{flex:0 0 calc(100% - 76px)!important;min-height:0!important;aspect-ratio:20/23!important;border-radius:28px!important;scroll-snap-align:center!important;scroll-snap-stop:always!important}\n.cn-precheck-dots{margin:0 0 12px!important}\n.cn-precheck-actions{margin-top:auto!important}\n.cn-precheck-confirm{color:#fff!important;background:linear-gradient(135deg,#97032d,#c95170)!important}\n@media(max-height:720px){.cn-check-card{aspect-ratio:1/1!important}.cn-precheck-scroll{padding-top:2px!important;padding-bottom:8px!important}}";
precheckStyle.textContent += "\n.cn-precheck{inset:calc(28% - 16px) 14px calc(16px + env(safe-area-inset-bottom))!important;padding:18px!important;border:1px solid rgba(255,255,255,.86)!important;border-radius:34px!important;background:#fffaf7!important;box-shadow:0 0 0 100vmax rgba(58,35,43,.18),0 -12px 34px rgba(85,39,53,.15),0 8px 20px rgba(85,39,53,.08)!important;overflow:hidden!important;animation:mcv-sheet-rise-v4 .36s cubic-bezier(.2,.9,.25,1)!important}\n.cn-precheck-status-v4{display:none!important}\n.cn-precheck-header{padding-top:8px!important}\n.cn-precheck-back{left:auto!important;right:0!important;top:3px!important;font-size:26px!important}\n.cn-precheck-actions{grid-template-columns:1fr!important;padding:8px 0 0!important}\n.cn-precheck-confirm{grid-column:1!important;width:100%!important}\n@keyframes mcv-sheet-rise-v4{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}\n@media(max-height:720px){.cn-precheck{inset:calc(28% - 10px) 10px calc(10px + env(safe-area-inset-bottom))!important;border-radius:28px!important;padding:14px!important}}";

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
  const keepReady = () => {
    confirm.disabled = false;
    confirm.classList.add("is-ready");
  };
  const syncDots = () => {
    const cards = Array.from(scroll.querySelectorAll(".cn-check-card"));
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
    page.remove();
    if (typeof win.__showCalibrationV4 === "function") win.__showCalibrationV4();
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
      header.innerHTML = `<div class="mcv-native-status-v4"><span>9:41</span><span class="mcv-native-system-v4" aria-hidden="true"><span class="mcv-native-signal-v4"><i></i><i></i><i></i><i></i></span><span class="mcv-native-wifi-v4"></span><span class="mcv-native-battery-v4"></span></span></div><nav class="mcv-native-nav-v4"><button class="mcv-native-icon-button-v4 mcv-native-back-v4" type="button" aria-label="Back">‹</button><h2>Pump Control</h2><span class="mcv-native-tools-v4"><button class="mcv-native-help-v4" type="button" aria-label="Help">?</button><button class="mcv-native-gear-v4" type="button" aria-label="Settings">⚙</button></span></nav><div class="mcv-native-device-v4"><img src="/comfort/public/pump-product.png" alt="V3 breast pump"></div>`;
      page.prepend(header);
    }
    enhanceNativeControlHeader();

    const inviteCopy = doc.querySelector(".cn-comfort-invite .mcv-invite-copy");
    if (inviteCopy) inviteCopy.textContent = "仅需 1 分钟，找到「有力度但不疼」的舒适档位";

    function enhanceComfortCard() {
      const entry = doc.getElementById("comfortEntry");
      const heading = entry && entry.querySelector(".mcv-comfort-heading");
      const main = entry && entry.querySelector(".mcv-comfort-main");
      const review = doc.getElementById("comfortAction");
      if (!entry || !heading || !main || !review || entry.classList.contains("mcv-comfort-entry-v4")) return;

      entry.classList.add("mcv-comfort-entry-v4");
      const info = doc.createElement("div");
      info.className = "mcv-comfort-info-v4";
      const actions = doc.createElement("div");
      actions.className = "mcv-comfort-ops-v4";
      const apply = doc.createElement("button");
      apply.type = "button";
      apply.className = "mcv-comfort-apply-v4";
      apply.textContent = "Apply";
      apply.setAttribute("aria-label", "Apply saved expression comfort levels");

      info.append(heading, main);
      actions.append(review, apply);
      entry.append(info, actions);

      function savedProfile() {
        const value = safeRead(PROFILE_KEY);
        return value && Number.isFinite(value.leftLevel) && Number.isFinite(value.rightLevel) ? value : null;
      }

      function syncApplyVisibility() {
        apply.hidden = !savedProfile();
      }

      apply.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const profile = savedProfile();
        if (!profile || apply.disabled) return;
        const leftMax = Number.parseInt(doc.getElementById("leftLevelChip")?.getAttribute("aria-valuemax"), 10) || 9;
        const rightMax = Number.parseInt(doc.getElementById("rightLevelChip")?.getAttribute("aria-valuemax"), 10) || 9;
        const targets = {
          left: Math.max(1, Math.min(leftMax, profile.leftLevel)),
          right: Math.max(1, Math.min(rightMax, profile.rightLevel))
        };
        let current = { left: readLevel("left"), right: readLevel("right") };

        apply.disabled = true;
        apply.textContent = "Applying…";
        if (targets.left < current.left) { current.left = targets.left; setPumpLevel("left", current.left); }
        if (targets.right < current.right) { current.right = targets.right; setPumpLevel("right", current.right); }

        const step = () => {
          let changed = false;
          if (current.left < targets.left) { current.left += 1; setPumpLevel("left", current.left); changed = true; }
          if (current.right < targets.right) { current.right += 1; setPumpLevel("right", current.right); changed = true; }
          if (changed) { win.setTimeout(step, 260); return; }
          buzz([8, 20, 8]);
          apply.textContent = "Applied ✓";
          apply.setAttribute("aria-label", "Saved expression comfort levels applied");
          if (typeof win.showToast === "function") win.showToast("Comfort levels applied");
          win.setTimeout(() => {
            apply.disabled = false;
            apply.textContent = "Apply";
            apply.setAttribute("aria-label", "Apply saved expression comfort levels");
          }, 1800);
        };
        step();
      });

      const observer = new win.MutationObserver(syncApplyVisibility);
      observer.observe(entry, { attributes: true, childList: true, subtree: true, characterData: true });
      syncApplyVisibility();
    }

    enhanceComfortCard();

    function enhanceComfortPlaceholder() {
      const placeholder = doc.getElementById("comfortPlaceholder");
      if (!placeholder || placeholder.classList.contains("mcv-comfort-placeholder-v4")) return;
      placeholder.classList.add("mcv-comfort-placeholder-v4");
      placeholder.innerHTML = `<div class="mcv-comfort-info-v4"><div class="mcv-comfort-heading"><strong class="mcv-comfort-title">Expression comfort</strong><span class="mcv-comfort-status-v4">Not set</span></div><div class="mcv-comfort-summary-v4">Not set</div></div><div class="mcv-comfort-ops-v4"><button class="mcv-comfort-review-v4" type="button">Review</button><button class="mcv-comfort-apply-v4" type="button" disabled>Apply</button></div>`;
      const status = placeholder.querySelector(".mcv-comfort-status-v4");
      const summary = placeholder.querySelector(".mcv-comfort-summary-v4");
      const review = placeholder.querySelector(".mcv-comfort-review-v4");
      const apply = placeholder.querySelector(".mcv-comfort-apply-v4");
      const profile = () => {
        const value = safeRead(PROFILE_KEY);
        return value && Number.isFinite(value.leftLevel) && Number.isFinite(value.rightLevel) ? value : null;
      };
      syncComfortPlaceholder = () => {
        const saved = profile();
        status.textContent = saved ? "Set" : "Not set";
        summary.textContent = saved ? `Saved · L ${saved.leftLevel} · R ${saved.rightLevel}` : "Not set";
        apply.disabled = !saved;
        apply.setAttribute("aria-label", saved ? "Apply saved expression comfort levels" : "Apply unavailable; expression comfort is not set");
      };
      review.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        showCalibration();
      });
      apply.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (apply.disabled) return;
        doc.querySelector("#comfortEntry .mcv-comfort-apply-v4")?.click();
      });
      syncComfortPlaceholder();
    }

    enhanceComfortPlaceholder();

    function splitComfortCardFromLevelModule() {
      const panel = doc.querySelector(".mcv-control-panel");
      const levelModule = doc.querySelector(".mcv-level-module");
      const entry = doc.getElementById("comfortEntry");
      const placeholder = doc.getElementById("comfortPlaceholder");
      if (!panel || !levelModule || !entry || !placeholder || panel.dataset.comfortCardsSplit === "true") return;
      panel.dataset.comfortCardsSplit = "true";
      entry.classList.add("mcv-comfort-card-v4");
      placeholder.classList.add("mcv-comfort-card-v4");
      levelModule.insertAdjacentElement("afterend", placeholder);
      levelModule.insertAdjacentElement("afterend", entry);
    }

    splitComfortCardFromLevelModule();

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

    function showCalibration() {
      const existing = doc.getElementById("cnCalibrationV4");
      if (existing) return;

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
        .comfort-v4{position:absolute;z-index:120;inset:calc(28% - 16px) 14px calc(16px + env(safe-area-inset-bottom));display:grid;grid-template-rows:auto auto 326px auto 1fr;gap:12px;overflow:hidden;padding:22px 18px calc(116px + env(safe-area-inset-bottom));border:1px solid rgba(255,255,255,.86);border-radius:34px;color:#3c2930;background:#fffaf7;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",Arial,sans-serif;box-shadow:0 0 0 100vmax rgba(58,35,43,.18),0 -12px 34px rgba(85,39,53,.15),0 8px 20px rgba(85,39,53,.08);animation:v4-sheet-rise .36s cubic-bezier(.2,.9,.25,1)}
        .comfort-v4 *{box-sizing:border-box}.comfort-v4 button{min-width:44px;min-height:44px;touch-action:manipulation}.comfort-v4 button:focus-visible{outline:3px solid rgba(142,0,40,.28);outline-offset:2px}
        .v4-status{position:relative;z-index:6;width:100%;height:154px;min-height:154px;padding:14px 16px 20px;box-sizing:border-box;border-radius:30px;color:#fff;background:linear-gradient(125deg,#98012e,#bd2f55 58%,#cf627d);box-shadow:0 14px 30px rgba(113,30,57,.16)}.v4-status:after{content:\"\";position:absolute;left:50%;bottom:8px;width:108px;height:5px;border-radius:99px;background:#fff;transform:translateX(-50%)}.v4-status-top{display:grid;grid-template-columns:62px minmax(0,1fr) 24px;align-items:center;gap:12px;height:58px}.v4-status-name{display:flex;align-items:center;gap:8px;font-size:24px;line-height:1;font-weight:850}.v4-status-swap{color:#efb5c4;font-size:13px;line-height:.8}.v4-status-arrow{justify-self:end;color:#efb5c4;font-size:32px;font-weight:300}.v4-status-divider{display:block;height:1px;margin:0;background:rgba(255,255,255,.2)}.v4-status-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding-top:10px}
        .v4-device{width:62px;height:58px;border-radius:18px;position:relative;display:grid;place-items:center;overflow:hidden;background:#fff;box-shadow:inset 0 -5px 10px rgba(62,27,39,.14),0 6px 14px rgba(65,0,18,.12)}.v4-device img{display:block;width:90%;height:90%;padding:0;object-fit:contain}.v4-device.is-running:after{content:\"\";position:absolute;inset:14px;border:1px solid rgba(255,255,255,.8);border-radius:50%;animation:v4-breathe 2s ease-in-out infinite}.v4-status-copy{min-width:0}.v4-status-copy strong,.v4-status-copy span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v4-status-copy strong{font-size:22px}.v4-status-copy span{margin-top:5px;font-size:13px;color:#f8d8e1}.v4-status-copy .v4-time{display:inline;margin:0;font-style:normal}.v4-pump-controls{display:flex;align-items:center}.v4-status .v4-pause{display:grid;place-items:center;width:58px;height:48px;border:0;border-radius:22px;color:#fff;background:#870022;font-size:19px;font-weight:800}.v4-status .v4-end{display:none}
        .v4-head{position:relative;text-align:center;padding:2px 54px 0}.v4-back{position:absolute;right:0;left:auto;top:0;width:46px;height:46px;border-radius:50%;color:#4a343c;background:#fff;box-shadow:0 8px 18px rgba(62,27,39,.08);font-size:25px}.v4-head h2{margin:0;color:#222;font-size:20px;line-height:1.25;font-weight:600;letter-spacing:.5px}.v4-head p{margin:5px 0 0;color:#888;font-size:13px;font-weight:400}.v4-progress{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}.v4-progress i{height:4px;border-radius:99px;background:#eadde1}.v4-progress i.is-complete,.v4-progress i.is-active{background:#b82e54}
        .v4-sides{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v4-side{height:42px;border:1px solid #e4d9dc;border-radius:999px;color:#444;background:#f7f2f3;font-size:14px;font-weight:400}.v4-side.is-active{color:#fff;border-color:#92002c;background:#92002c;font-weight:600}.v4-side.is-done{color:#8e0028;background:#fff;font-weight:600}.v4-side:disabled{cursor:not-allowed;opacity:.52}
        .v4-adjust{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);grid-template-rows:1fr;align-items:center;column-gap:12px;width:min(100%,320px);justify-self:center;min-height:0;padding:10px 0 42px}.v4-control-stack{grid-column:2;grid-row:1;justify-self:stretch;align-self:center;display:flex;flex-direction:column;justify-content:space-between;height:184px;min-width:0}.v4-control-row{display:grid;grid-template-columns:46px minmax(0,1fr);align-items:center;gap:7px;min-width:0}.v4-control-row span{color:#999;font-size:12px;font-weight:400;line-height:1.3;text-align:left}.v4-step{width:46px;height:46px;border-radius:50%;color:#96002d;background:#fce6eb;font-size:24px;box-shadow:0 7px 16px rgba(104,0,31,.07)}.v4-step:disabled{color:#b9afb2;background:#f0ebec;box-shadow:none}
        .v4-rail-wrap{grid-column:1;grid-row:1;justify-self:center;align-self:center;display:grid;place-items:center;min-height:0}.v4-rail{position:relative;width:126px;height:224px;touch-action:none;cursor:ns-resize}.v4-rail:before{content:"";position:absolute;top:10px;bottom:10px;left:50%;width:58px;border-radius:32px;background:linear-gradient(#f8eff1,#f2edef);transform:translateX(-50%)}.v4-ticks{position:absolute;inset:18px 0;display:flex;flex-direction:column-reverse;justify-content:space-between;align-items:center}.v4-ticks i{display:block;width:38px;height:3px;border-radius:99px;background:#e7cad2}.v4-ticks i:nth-child(n+6){background:#d69aaa}.v4-ticks i:nth-child(n+11){background:#ba536f}
        .v4-marker{position:absolute;left:50%;bottom:0;display:grid;place-items:center;width:108px;height:52px;border-radius:999px;color:#fff;background:linear-gradient(135deg,#92002d,#ca5370);font-size:24px;font-weight:700;transform:translate(-50%,50%);box-shadow:0 10px 22px rgba(128,8,46,.2);transition:bottom .22s ease;touch-action:none}.v4-observe{display:none}
        .v4-reference{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;min-height:36px;margin-top:8px;padding:8px 14px;border-radius:14px;color:#555;background:#f5eef0;font-size:13px;font-weight:400;text-align:center}.v4-reference strong{color:#555;margin-right:4px;font-weight:600}
        .v4-actions{position:absolute;z-index:3;left:18px;right:18px;bottom:calc(14px + env(safe-area-inset-bottom));display:grid;gap:6px;padding:14px 0 0;background:linear-gradient(180deg,rgba(255,250,247,0),#fffaf7 22px)}.v4-question{margin:0;text-align:center;color:#333;font-size:16px;line-height:1.25;font-weight:600}.v4-hint{text-align:center;color:#999;font-size:12px;font-weight:400;line-height:1.35}.v4-save{width:100%;height:58px;border-radius:999px;color:#fff;background:linear-gradient(120deg,#93002d,#ca5270);font-size:14px;font-weight:800;box-shadow:0 10px 22px rgba(123,0,38,.16)}.v4-save:disabled{color:#fff;background:#dba5b2;box-shadow:none}
        .comfort-v4.is-paused .v4-adjust,.comfort-v4.is-paused .v4-save{pointer-events:none;opacity:.44}.comfort-v4.is-paused .v4-device:after{animation-play-state:paused}
        .v4-modal{position:absolute;z-index:4;inset:0;display:grid;place-items:center;padding:24px;background:rgba(48,31,38,.32);backdrop-filter:blur(4px)}.v4-modal-card{width:100%;max-width:340px;padding:22px;border-radius:26px;text-align:center;background:#fffdfa;box-shadow:0 24px 60px rgba(57,30,40,.22)}.v4-modal-card h3{margin:0;font-size:18px}.v4-modal-card p{margin:8px 0 16px;color:#897d82;font-size:11px;line-height:1.55}.v4-modal-card button{width:100%;height:46px;margin-top:8px;border-radius:999px;font-size:12px;font-weight:800}.v4-primary{color:#fff;background:#90002b}.v4-secondary{color:#8e0028;border:1px solid #e5cbd2;background:#fff}.v4-tertiary{color:#75686d;background:transparent}
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

      const page = doc.createElement("section");
      page.id = "cnCalibrationV4";
      page.className = "comfort-v4";
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
            <div class="v4-rail" role="slider" aria-label="当前侧吸力档位" aria-valuemin="1" aria-valuemax="15" tabindex="0">
              <span class="v4-ticks" aria-hidden="true">${"<i></i>".repeat(MAX_LEVEL)}</span>
              <b class="v4-marker"></b>
            </div>
            <span class="v4-observe" role="status">可调节或确认当前档位</span>
          </div>
        </main>
        <div class="v4-reference"><strong>舒适参考：</strong>有拉扯感，无刺痛、无不适感</div>
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
  layer.innerHTML = `<div class="v4-complete-sheet"><img class="v4-saved-bunny" src="/comfort/assets/saved-bunny-reference.png" alt="" aria-hidden="true"><h3>Saved</h3><p>舒适档位已保存</p></div>`;
  page.appendChild(layer);
  try { if (typeof win.updateProfileUi === "function") win.updateProfileUi(); } catch (_) {}
  win.setTimeout(() => {
    if (!layer.isConnected) return;
    layer.remove();
    closeCalibration();
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
          { label: "确认退出", className: "v4-primary", action: () => { safeWrite(DRAFT_KEY, { leftLevel:left, rightLevel:right, side, leftDone, rightDone, savedAt:new Date().toISOString() }); closeCalibration(); } },
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

  ["currentFrame", "embeddedFrame"].forEach(function (id) {
    const frame = document.getElementById(id);
    if (!frame) return;
    frame.addEventListener("load", function () { install(frame); });
    if (frame.contentDocument && frame.contentDocument.readyState === "complete") install(frame);
  });
})();
