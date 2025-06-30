(async () => {
  const { Storage } = await import("../../browser-api.js");

  let boxes = document.querySelectorAll(`[type="checkbox"]`);

  boxes.forEach(el => {

    Storage.sync.get("settings").then(result => {
      el.checked = result.settings[el.id];
    });

    el.addEventListener("click", () => {
      Storage.sync.get("settings").then(result => {
        result.settings[el.id] = el.checked;
        Storage.sync.set({ settings: result.settings });
      });
    });

  });
})();
