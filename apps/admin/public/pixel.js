/**
 * FéConecta Pixel SDK v1.0
 * Rastreamento de conversões, eventos e vendas para anunciantes do FéAds.
 * (c) FéConecta - Todos os direitos reservados.
 */
(function (window, document) {
  "use strict";

  if (window.feconectaPixel && window.feconectaPixel.loaded) {
    return;
  }

  // 1. Identifica o Script Tag e Pixel ID
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf("pixel.js") !== -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  var pixelId = currentScript ? currentScript.getAttribute("data-pixel-id") : null;
  var apiBase = currentScript && currentScript.getAttribute("data-api-url")
    ? currentScript.getAttribute("data-api-url")
    : (currentScript && currentScript.src ? new URL(currentScript.src).origin : "https://feconecta.com.br");

  // 2. Helpers de Storage (First-Party Cookie + LocalStorage)
  function getQueryParam(param) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  function setStorage(key, val, days) {
    try {
      localStorage.setItem(key, val);
    } catch (e) {}
    try {
      var d = new Date();
      d.setTime(d.getTime() + (days || 30) * 24 * 60 * 60 * 1000);
      document.cookie = key + "=" + encodeURIComponent(val) + ";path=/;expires=" + d.toUTCString() + ";SameSite=Lax";
    } catch (e) {}
  }

  function getStorage(key) {
    var v = null;
    try {
      v = localStorage.getItem(key);
    } catch (e) {}
    if (!v) {
      try {
        var match = document.cookie.match(new RegExp("(^| )" + key + "=([^;]+)"));
        if (match) v = decodeURIComponent(match[2]);
      } catch (e) {}
    }
    return v;
  }

  // 3. Captura parâmetros de campanha vindos do anúncio
  var urlCampaignId = getQueryParam("fc_cid") || getQueryParam("campaign_id");
  var urlPixelId = getQueryParam("fc_pid");

  if (urlCampaignId) {
    setStorage("_fc_cid", urlCampaignId, 30);
  }
  if (urlPixelId) {
    setStorage("_fc_pid", urlPixelId, 30);
    if (!pixelId) pixelId = urlPixelId;
  }
  if (pixelId) {
    setStorage("_fc_pid", pixelId, 30);
  }

  // 4. Motor de Disparo de Eventos
  function track(eventName, data) {
    var activePixelId = pixelId || getStorage("_fc_pid") || "FC-DEFAULT";
    var activeCampaignId = getStorage("_fc_cid") || null;
    var eventData = data || {};

    var payload = {
      pixel_id: activePixelId,
      campaign_id: activeCampaignId,
      event_name: eventName,
      event_id: eventData.event_id || ("evt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8)),
      value: eventData.value ? Number(eventData.value) : 0,
      currency: eventData.currency || "BRL",
      order_id: eventData.order_id || null,
      url: window.location.href,
      referrer: document.referrer || null,
      metadata: eventData,
    };

    var endpoint = apiBase + "/api/events";

    // Envio via Beacon API (assíncrono e confiável mesmo no unload) ou fetch
    var payloadStr = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      var blob = new Blob([payloadStr], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
    } else {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", endpoint, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(payloadStr);
      } catch (err) {
        console.warn("[FéConecta Pixel] Erro no envio de evento:", err);
      }
    }
  }

  // 5. Instanciação Global
  window.feconectaPixel = {
    loaded: true,
    version: "1.0.0",
    pixelId: pixelId,
    track: track,
  };

  // Dispara PageView automático no carregamento
  try {
    track("PageView");
  } catch (e) {}

})(window, document);
