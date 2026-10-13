"use strict";

const VERSION = "c161ea7bc407";
const FILES = {
  ".nojekyll": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "assets/coin.png": "ad1f568bc66eeac3b601d36350157f1ab1eb2d44f5e47e721c37870f10a1290f",
  "assets/fx_levelup.png": "d2435d5659d663b047a427599602b95a6ce0abf26bcbbf29f27469b532d867be",
  "assets/fx_return.png": "97f2918a318f7e0f051af4d6e7aafa37b29d01fb6dadbe1772fc8da2aee84d89",
  "assets/fx_slash.png": "faf5de591cd78a07b209ecfad4abda3a657663e7a5622a47f4f780e13e4d476f",
  "assets/fx_smoke.png": "206a9487b996a6d60a682e7a55923f27612f5331d53a587a19ad7b33e71a3814",
  "assets/hero.png": "c18d65e0b6b4cf9a60ccc2687234cfe6cfe8d361659bd9e559efe9c2d603c122",
  "assets/icons/armorScroll.png": "18b0b275c18584ae1badd43de89fc8d40b8dd48c1227ed3d3b82b5f9c17ec672",
  "assets/icons/chainArmor.png": "7374d9919780eb0aff55f358ea7a0b2a3b2afdc76e4dff200a3d87196fc91e79",
  "assets/icons/clothArmor.png": "5ea88869a03e73877c10cdbba5424e7c62dc8448175ae99240d37517b050350b",
  "assets/icons/deepSword.png": "2382d8ad90d81001a4d30b7802251ffb04d5cff231b5214c4b85f5aee1dcce67",
  "assets/icons/ironSword.png": "22553319f5a9c3494fce8a6d1170c8b5bbcad175ecd0caa9f52e22d7a2c5067e",
  "assets/icons/leatherArmor.png": "9bcbf38df45c9a88120c025cfdcad4b9a1b71c8b1f4bc04000694f7348c735c7",
  "assets/icons/plateArmor.png": "81760da63cbc72297b1a0df0113e6e0911457eeb62a0a2d5c46d39ab7185ca66",
  "assets/icons/potion.png": "217d036eae8bc50dd8dda11f0637ed9e2b359f97fa6d3cdccc77625884232299",
  "assets/icons/returnScroll.png": "7b0ebc0bdcd2cc5b3f6937f67f8f1f6b665c6f17573a6565e74d1e393afcf246",
  "assets/icons/steelSword.png": "aae2d7353dd0132dc850a396da0082ab3ee260ac5167b7c9a945c2cfe84a2047",
  "assets/icons/weaponScroll.png": "ab6a226d68b8e8229a042f3cc7036f3600716fd8d68e477419c7040b089a4dc8",
  "assets/icons/woodSword.png": "991222329ceef9630d0edd3964965c53444d3fbd09366acb92ffe4772ea92cae",
  "assets/knight.png": "1212d624d20ef3142bd9caf0cf1881dac1e5c3c9f29c5ae9d8ca5989e294d129",
  "assets/m_boss.png": "07746547ed48df456cef86b0ca78de5c898418e636777cedde092128dd5a723b",
  "assets/m_crab.png": "cc4b33e3a87ee2ad1de96481fc5e442253597795ea96756fa6ab4a0a656d0cce",
  "assets/m_ember.png": "e6eec054d1da8834238aff258051410227a9047c0bd24136f85d8ef653da8c09",
  "assets/m_goblin.png": "eabbf11bb89aafcb91eb89cc85f2dce1ee608daf918be7f5832a9298cd2bf773",
  "assets/m_hopfrog.png": "0329b921f5e1bbff584433470a96749a34a4b52046a92758e82a9f3ca4aa7ece",
  "assets/m_jelly.png": "af0e4315e37a615dce1bbd362035fa69ce6f9f0c5995b8c4d5f59331e7fbcb1d",
  "assets/m_mouse.png": "d935c6742c009aa99458e784bd3768e90c03c5b2dd08e999473af50aa706ad02",
  "assets/m_nightwing.png": "b77966bc68f5333ed5332684592cbb04620f6431faaecd723eccb10797a2420c",
  "assets/m_raccoon.png": "609e0532162482cb621dd264d93c8515177643d61984c7ab4bcb1687979b45f8",
  "assets/m_stalker.png": "832f60d4bb4b3141b6040a5cfc83f65312eab4d81b698c1384e7dfbfb5ee812b",
  "assets/m_vine.png": "0c8cbc3be9b242f7e2ee830ff45e8e20b746f36f9e7c56ee8c792b3eaf029bcb",
  "assets/npc_bank.png": "10136e78185754a94b404d7d68d05af37217f0edf7a96627a361bdc27bcb0128",
  "assets/npc_shop.png": "79ee75f1cf2e11f96b94d4bf102013b86ac46b5fd9ec4243e408954ade4aa2c3",
  "assets/npc_smith.png": "268e2403a50ed3c05189e6637005ad2b1715e2aaa1e9eebec07057bc3baceb86",
  "assets/npc_tele.png": "7d8fd847e3f9655e5e36783abf1d91230d29d9bd60d03d9ae96700bf748c8d5f",
  "assets/potion.png": "5ac50bf70b0701146b2fd97ef5a91979ef2f4c5b388daef95b2a808b3bae6cc7",
  "assets/scroll.png": "97ff31e60b9d41155b72fcd59ef53406134b4e811c614125bcb779fcb4a8769d",
  "assets/sword.png": "5fe1e6d57b0ce79769c8760bafec94bc6c047027ea32e3da2722a42a689628bc",
  "assets/tiles.png": "aa2708aa07cabda86f02d65bf2095a6b53b96fdfd43cf191931689f517f284a4",
  "assets/출처.txt": "f8ad6df571f7bfeef8a583323fe40ae6ee01cfc95c528e00148ff1a132c0f4c0",
  "data/balance.js": "bcf0d162384c2f0e9a0658b97826c0f9f4b65f2bf97566dd4290bb6ee5df3d68",
  "data/maps.js": "96f48089454cdd402ab789a4e1e44c2ee3aadebbaf3a5ef3444a0b05c72d35ad",
  "icons/icon-192.png": "c1e8a42f4760de72d5ba21a1d683111e137ab863893827b5c4e9ed2ceb86aaf2",
  "icons/icon-512.png": "f236786d645fb51e02640e919d146a79b8d47925599c924ccb86ef4ae34470c7",
  "icons/icon-maskable-512.png": "d209bbef68bf9c836b7675a99c297b45d7ec2d55a4b75736f042870ddd8e567d",
  "index.html": "ad3bc0595ca42f5ab65645a6bf70aeecaf05814efd08ab4f431681c243838480",
  "manifest.webmanifest": "e52e09ae050d75862cd4048e27a0480f2a2e128b32557c4debb4160aa3809f8e",
  "src/domain/autohunt.js": "cf92b79d51a64ab7e28f8a7be2370ad2dc059cad3138eba28b6660caba78c683",
  "src/domain/boss.js": "b790e89be265778080875009b3fd37f19b7714d4f6c73cb06308126e5e34ff33",
  "src/domain/combat.js": "884d1b2605e68ef7afe1da870a86e2d541df1ccd2dbc0ced16bd9e55688fdf67",
  "src/domain/common.js": "c9729e11b2dd0360681512295716a92ead34d70e33174400476bce220cd1c75a",
  "src/domain/enchant.js": "d2f751456e0d899c35535a6a75a741fff212854de71376d8e2efb4bb47e45bc6",
  "src/domain/inventory.js": "2bf292c754d40952d2e430c1a270d738a0984cd247eb2313a377a1c03a7fff99",
  "src/domain/progression.js": "07b8f5a128c418a9d194036e19cc81d3cfa7900ed6cbe6005651b150fd7d0592",
  "src/domain/rewards.js": "5255ca804daa0cf20186acdc8766b6fce22720e8f660c968bb61869d2dba7c10",
  "src/domain/rng.js": "8ebeafdafd410bd9b3a4ca4965873bb7aec94204026292ee609c9aa5c406b29a",
  "src/domain/save.js": "72fa119fd88706c440b6da1cd14c6f383425a5f89fe9846b6e2967d2a770610a",
  "src/main.js": "1d88762aa377c3c40cf06fdb01e63e3789c9d8747264f9ffeb342103b284ad12",
  "src/scenes/World.js": "5ad19857e4fdb4b6385a94ab0d927624f55dadd626dbcef16151a9954a890e14",
  "src/state.js": "892d9e7f7fcdd202005afbd54eae89ea5b627ecd436d0e341b01f6de7bec4814",
  "src/ui/hud.css": "9334d830f10877862885b240ef87a85f409c2117a7ee7fca163e08419159e40b",
  "src/ui/joystick.js": "2b5ee6b05b97fd918a4f451cf9618efb0e3a957018c1eee936712324074b02c4",
  "src/ui/minimap.js": "13147ade821c7636c170d3c2fbc243e29f5ffb81031ef695248a67b6e1fda9d9",
  "src/ui/prefs.js": "0b8ddcd32543518332eb97f9ee1121ee76aae0f46f634904e462ede4d5ee3aca",
  "src/ui/windows.js": "2f1781859d021c1923baec6db2d513897721ae936de1d0da31f12db57d6bc147",
  "vendor/phaser.min.js": "e92ddef111ba42e92d316979c732311757093688ea1810591cb7aa2858eba7a7"
};
const CACHE_NAME = "hwantasy-" + VERSION;
const fileURL = name => new URL(name, self.registration.scope).href;
let firstInstall = false;

// 빌드 파일 전부를 받아 SHA-256을 확인하고 이 빌드의 캐시에 넣는다(하나라도 다르면 캐시 삭제)
async function precache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    // Sequential writes ensure no unfinished fetch can recreate a failed cache.
    for (const [name, expected] of Object.entries(FILES)) {
      const url = fileURL(name);
      const response = await fetch(url, {cache: "reload"});
      if (!response.ok || response.type === "opaque" || response.url !== url) {
        throw new Error("파일 응답 실패: " + name);
      }
      const digest = await crypto.subtle.digest("SHA-256", await response.clone().arrayBuffer());
      const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
      if (actual !== expected) throw new Error("SHA-256 불일치: " + name);
      await cache.put(url, response);
    }
  } catch (error) {
    await caches.delete(CACHE_NAME);
    throw error;
  }
}

self.addEventListener("install", event => {
  firstInstall = !self.registration.active;
  event.waitUntil(precache());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("hwantasy-") && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    if (firstInstall) await self.clients.claim();
  })());
});

let repairing = null;
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    // 캐시를 열기만 해도 빈 캐시가 생기므로 먼저 있는지 본다
    if (!await caches.has(CACHE_NAME)) {
      // 다른 앱·브라우저가 캐시를 지운 경우: 이번 실행은 인터넷 파일로 통째로 열고,
      // 같은 빌드가 아직 올라가 있으면 해시를 확인하며 다시 채운다(다르면 새 버전 설치를 기다림)
      if (event.request.mode === "navigate" && !repairing) {
        repairing = precache().catch(() => {}).finally(() => { repairing = null; });
        event.waitUntil(repairing);
      }
      return fetch(event.request);
    }
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(event.request.mode === "navigate" ? fileURL("index.html") : event.request);
    return response || fetch(event.request);
  })());
});

self.addEventListener("message", event => {
  const reply = data => {
    if (event.ports && event.ports[0]) event.ports[0].postMessage(data);
  };
  if (event.data === "status") {
    event.waitUntil((async () => {
      try {
        let ready = await caches.has(CACHE_NAME);
        if (ready) {
          const cache = await caches.open(CACHE_NAME);
          for (const name of Object.keys(FILES)) {
            if (!await cache.match(fileURL(name))) { ready = false; break; }
          }
        }
        reply({ready, version: VERSION});
      } catch (_) {
        reply({ready: false, version: VERSION});
      }
    })());
  } else if (event.data === "apply") {
    event.waitUntil((async () => {
      try {
        // A waiting worker controls no windows yet, so include uncontrolled
        // clients and count only windows inside this registration's scope.
        const windows = (await self.clients.matchAll({type: "window", includeUncontrolled: true}))
          .filter(client => client.url.startsWith(self.registration.scope));
        if (windows.length !== 1) {
          reply({applied: false, reason: "window-count", windows: windows.length});
          return;
        }
        await self.skipWaiting();
        reply({applied: true, version: VERSION});
      } catch (_) {
        reply({applied: false, reason: "apply-failed"});
      }
    })());
  }
});
