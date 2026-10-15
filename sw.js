"use strict";

const VERSION = "e22b4df3c93e";
const FILES = {
  ".nojekyll": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "assets/coin.png": "ad1f568bc66eeac3b601d36350157f1ab1eb2d44f5e47e721c37870f10a1290f",
  "assets/fx_levelup.png": "d2435d5659d663b047a427599602b95a6ce0abf26bcbbf29f27469b532d867be",
  "assets/fx_return.png": "97f2918a318f7e0f051af4d6e7aafa37b29d01fb6dadbe1772fc8da2aee84d89",
  "assets/fx_slash.png": "faf5de591cd78a07b209ecfad4abda3a657663e7a5622a47f4f780e13e4d476f",
  "assets/fx_smoke.png": "206a9487b996a6d60a682e7a55923f27612f5331d53a587a19ad7b33e71a3814",
  "assets/hero.png": "c18d65e0b6b4cf9a60ccc2687234cfe6cfe8d361659bd9e559efe9c2d603c122",
  "assets/icons/armorScroll.png": "18b0b275c18584ae1badd43de89fc8d40b8dd48c1227ed3d3b82b5f9c17ec672",
  "assets/icons/belt1.png": "0af3258df38f4e2c0920c43894635dc6e58686641de75e5cc5fc6ef997477807",
  "assets/icons/belt2.png": "ef751edc8694c96cf6945eb5dc1dbb00a85b1001035ef19ae2c30818e9f81fbd",
  "assets/icons/belt3.png": "738787034b097401ea7f6701a8af52a5c739ee9f4078fd2fc4f5f63a22b61be5",
  "assets/icons/belt4.png": "6be50dc75bee22c1c32fc6ef497f7b07580ad8421fc52b3aff53ea55f8ebd7b7",
  "assets/icons/boots1.png": "a9f5072ed8f35fd29eacc98dda4c25a7d0807b7107ef006d5807aeb0ba5d2345",
  "assets/icons/boots2.png": "cbe91c5e0ba159c506f7049a622695e70237d8212035da5d33256d34e54a85bc",
  "assets/icons/boots3.png": "cb5629bddcfd205525530fb973bc664904d007a781b83fd5ef6963732f0092cd",
  "assets/icons/boots4.png": "620e78dcfc7e6dc7fb89d2e0d38b180e0062a993356f0a28992a6e00c0e0ccf3",
  "assets/icons/chainArmor.png": "7374d9919780eb0aff55f358ea7a0b2a3b2afdc76e4dff200a3d87196fc91e79",
  "assets/icons/cloak1.png": "7bc71a0691155367bb4bec4de64b8b20f220f4027f025fb46496fa9aaa537663",
  "assets/icons/cloak2.png": "b24f3bd61d5fd8d2c035d17a04b61178333290732aa14c328fdeaba7417a31b7",
  "assets/icons/cloak3.png": "a20d68f3ffe9f4cdaf4fbb4fce994fffb14cf9cbb1fbf3a5b6a55511aa6be721",
  "assets/icons/cloak4.png": "d004d23cdc498c2e20a208931bcf5b48cda9f4a8cea2bae822c408ba0498d22f",
  "assets/icons/clothArmor.png": "5ea88869a03e73877c10cdbba5424e7c62dc8448175ae99240d37517b050350b",
  "assets/icons/deepSword.png": "2382d8ad90d81001a4d30b7802251ffb04d5cff231b5214c4b85f5aee1dcce67",
  "assets/icons/gloves1.png": "af73e16b53b72660154da3573d64c98746570a054d0621a86a6c8b6b56686929",
  "assets/icons/gloves2.png": "ad3b130de6f432ac0b796fb53358d416c5a0c3507b1ae406266b0f8ccfe63308",
  "assets/icons/gloves3.png": "7d5a7331d917bd5ec67f4f652043f085c5bacd99b980e89bcc0965ee30729757",
  "assets/icons/gloves4.png": "f45cf59e82f0757c17daf30ada524c2c7d59eff6cbc1d1ca2667c4187f234745",
  "assets/icons/helm1.png": "fdeee5bc76c124185c3758bb898e184ce7a61c23246b013598a7fe0c7d5999a1",
  "assets/icons/helm2.png": "cbd7a083c715a4b47cdefc75d4eafc1878f90475ec7f0e7848af1c422845eed9",
  "assets/icons/helm3.png": "3481045636c23f5d7e1af2aee4b86563ae8e1f70c44198b8e4213531c8feb780",
  "assets/icons/helm4.png": "6439c2edb4c0137456e5a467e009e564fdbda6b6ef6df37e6bb5a8391e01cbb8",
  "assets/icons/ironSword.png": "22553319f5a9c3494fce8a6d1170c8b5bbcad175ecd0caa9f52e22d7a2c5067e",
  "assets/icons/leatherArmor.png": "9bcbf38df45c9a88120c025cfdcad4b9a1b71c8b1f4bc04000694f7348c735c7",
  "assets/icons/map.png": "bd2ebea34e83eb3e03f15dc0524c9f4d5ddc60b25202944ea12ad4324321da1c",
  "assets/icons/mithrilArmor.png": "067a1f854739a76387d6a4571859a4df23191cc14d3767862db5e9e72874fbc1",
  "assets/icons/mithrilSword.png": "b7daad8a28e66e456332c79d1dd33988b1ac47f82d87cafa8b29b741fe6ab022",
  "assets/icons/pants1.png": "0e3af422d576482c2f4354801a318efd61f08ccbb0f7f57acc2a1bd231d216bc",
  "assets/icons/pants2.png": "e27b5a0cc196d1f9bf0a85d908b1bfe12fec8f892eb230f6118fcad17b453f30",
  "assets/icons/pants3.png": "bca17ccc3f96d3f4691692b20acb5bdf126d9a6af6679eec19ecd3b938b76bc9",
  "assets/icons/pants4.png": "dca5960141a0b0f5c8d8528f33119e15611d46b66a4b12451adbc6885747fe46",
  "assets/icons/plateArmor.png": "81760da63cbc72297b1a0df0113e6e0911457eeb62a0a2d5c46d39ab7185ca66",
  "assets/icons/potion.png": "217d036eae8bc50dd8dda11f0637ed9e2b359f97fa6d3cdccc77625884232299",
  "assets/icons/potionHigh.png": "dadca29ac4707fcc3af6d401161c587926196e9ca4fa67b65b5ae057680b1e9b",
  "assets/icons/potionMid.png": "db639a6b1d23d14a9564ad56e68eb4a55444c14809220b48446991cf938d4219",
  "assets/icons/rates.png": "c2a98df71f3aa27e05b89ebe4a4ddc15d11fdeb0b2f1a0f08fe4cf88c9acc1af",
  "assets/icons/returnScroll.png": "7b0ebc0bdcd2cc5b3f6937f67f8f1f6b665c6f17573a6565e74d1e393afcf246",
  "assets/icons/shirt1.png": "a9afd6d339588d6ca0f278f78976cf0b6040a1e88f1cbf8000ae5ecf96577023",
  "assets/icons/shirt2.png": "0c2b43f95ddaf23aa6b13af8edde2a819d7c01c54ae8d2fff5e5366bae77defe",
  "assets/icons/shirt3.png": "3e6ef114b23b8531659c282ed832e2cce01c1981e76e1ef7941215967cc3d93d",
  "assets/icons/shirt4.png": "ce42d4a293f75bfa808567912e141d382279f76f0ad60dc25597d57f35d4105f",
  "assets/icons/sk_bash.png": "49d9142649365a443c9b02c468de746d0a12fb1e4e9541a6d293e71cc17ac25c",
  "assets/icons/sk_block.png": "101f2e02d24d406cbe83558e96ca8fde144999f7240704842d8b7aa1d5253734",
  "assets/icons/sk_counter.png": "3736f22938111c5044477f72d65c1200d3043d814316e3e8778c0e1ea0de55a3",
  "assets/icons/sk_dash.png": "99fb451797bc7f3eb5a9861531de093ace1451a18f5f28426e33f48a22fef800",
  "assets/icons/sk_guard.png": "1ce707492e5f0887f601ec6ada3f34ffe3d5216743fd9674784e12f53f37dd2e",
  "assets/icons/sk_heal.png": "1319168ec6173fd94f5e2f0a7f26bc5c24842317bbb5b32ea344e5ba51561fb8",
  "assets/icons/sk_p_body.png": "96c7f54bea7dd84161f8df900aa56e28011ebea945cf94b71c277a64c5e0b6b8",
  "assets/icons/sk_p_crit.png": "59cc7a0dc71d522ebb3b0f52dd05437344bb4784edac60c59c03afadf5811032",
  "assets/icons/sk_p_focus.png": "52077f94478b9951616c6489930ef164244bab12848e65cd5c4c7698c742d0d5",
  "assets/icons/sk_p_skin.png": "b979c1ab310b103080243ff60b864c2bd04e49a04dd98f3b8374bc435d98d96f",
  "assets/icons/sk_p_will.png": "18a5ac4cd7c4bb2c5243021e37b37ad5968f335d7e583b71d30edb8eb35bd51f",
  "assets/icons/sk_quake.png": "790e8e6ce393aa648e940d2e1929df72be664825fef4ff2be2077ee746eedef7",
  "assets/icons/sk_stun.png": "5a2e6d1d71741d9a61ddd5b31c9024863ad2ae85f68152232e82b6bf48a7c5cb",
  "assets/icons/sk_ult.png": "5645d3f921753aeef8159e2e97ec8087ca3193a8145068a765f1f3245021eea0",
  "assets/icons/sk_whirl.png": "b4890a6d0e2a0b9c6e72c7a99ce8c533881203478e97ae633b6c2aa7f865ffff",
  "assets/icons/steelSword.png": "aae2d7353dd0132dc850a396da0082ab3ee260ac5167b7c9a945c2cfe84a2047",
  "assets/icons/weaponScroll.png": "ab6a226d68b8e8229a042f3cc7036f3600716fd8d68e477419c7040b089a4dc8",
  "assets/icons/woodSword.png": "991222329ceef9630d0edd3964965c53444d3fbd09366acb92ffe4772ea92cae",
  "assets/icons/wraithArmor.png": "0e1d7d3e6cc354bda4408e8704f9367b72cba81bbdb8af232dc3b421bcd22ed0",
  "assets/icons/wraithSword.png": "12e36ba180843a6a060c6b0362d47c49ec6ad2a9c41301b20e2362fa122665d8",
  "assets/knight.png": "1212d624d20ef3142bd9caf0cf1881dac1e5c3c9f29c5ae9d8ca5989e294d129",
  "assets/m_boss.png": "07746547ed48df456cef86b0ca78de5c898418e636777cedde092128dd5a723b",
  "assets/m_crab.png": "cc4b33e3a87ee2ad1de96481fc5e442253597795ea96756fa6ab4a0a656d0cce",
  "assets/m_ember.png": "e6eec054d1da8834238aff258051410227a9047c0bd24136f85d8ef653da8c09",
  "assets/m_eye.png": "81a33671710ae9e311a976bb21cd206626af9c70587042df6d97ac5cd411a7e7",
  "assets/m_goblin.png": "eabbf11bb89aafcb91eb89cc85f2dce1ee608daf918be7f5832a9298cd2bf773",
  "assets/m_hopfrog.png": "0329b921f5e1bbff584433470a96749a34a4b52046a92758e82a9f3ca4aa7ece",
  "assets/m_jelly.png": "af0e4315e37a615dce1bbd362035fa69ce6f9f0c5995b8c4d5f59331e7fbcb1d",
  "assets/m_lich.png": "55fd879f69ffe7d178b3b63c6057ab86d67c44493c2ea27a59c24a717e4dced0",
  "assets/m_mouse.png": "d935c6742c009aa99458e784bd3768e90c03c5b2dd08e999473af50aa706ad02",
  "assets/m_nightwing.png": "b77966bc68f5333ed5332684592cbb04620f6431faaecd723eccb10797a2420c",
  "assets/m_raccoon.png": "609e0532162482cb621dd264d93c8515177643d61984c7ab4bcb1687979b45f8",
  "assets/m_skull.png": "238b5985bbc8d236163e3d6616d718f518005aaf83151fe0199bd108eb8f0f0e",
  "assets/m_stalker.png": "832f60d4bb4b3141b6040a5cfc83f65312eab4d81b698c1384e7dfbfb5ee812b",
  "assets/m_vine.png": "0c8cbc3be9b242f7e2ee830ff45e8e20b746f36f9e7c56ee8c792b3eaf029bcb",
  "assets/m_warden.png": "1948193b1b4dcca3d2afffcffb8769bd33b96dea26e240f632e4433957f84234",
  "assets/m_wisp.png": "84825765c70997d94a8650c545651cf8295259b259dd1aa3fe8114c5b72c96c2",
  "assets/npc_bank.png": "10136e78185754a94b404d7d68d05af37217f0edf7a96627a361bdc27bcb0128",
  "assets/npc_shop.png": "79ee75f1cf2e11f96b94d4bf102013b86ac46b5fd9ec4243e408954ade4aa2c3",
  "assets/npc_smith.png": "268e2403a50ed3c05189e6637005ad2b1715e2aaa1e9eebec07057bc3baceb86",
  "assets/npc_tele.png": "7d8fd847e3f9655e5e36783abf1d91230d29d9bd60d03d9ae96700bf748c8d5f",
  "assets/potion.png": "5ac50bf70b0701146b2fd97ef5a91979ef2f4c5b388daef95b2a808b3bae6cc7",
  "assets/scroll.png": "97ff31e60b9d41155b72fcd59ef53406134b4e811c614125bcb779fcb4a8769d",
  "assets/sword.png": "5fe1e6d57b0ce79769c8760bafec94bc6c047027ea32e3da2722a42a689628bc",
  "assets/tiles.png": "aa2708aa07cabda86f02d65bf2095a6b53b96fdfd43cf191931689f517f284a4",
  "assets/tiles_ex.png": "2189ecbaad7b4fd703db4b418485ca4ab63dda917bf205d3a2367f15dfe980bd",
  "assets/ult_sword.png": "0f63c5f80c169f8812fd6805ec39b71c382adce7794822e7117cdc534e783519",
  "assets/출처.txt": "038b87fb084bed371e079ef4c916ea14b03090efb267c048eb1d8c278432bba6",
  "data/balance.js": "1577a2029437be0d764c7a0a1e68e028c3fe1052d648dceac0d279958948c023",
  "data/estimate.js": "43ed90f3ddd32e0691b19267c424c83ce7a5a3a3fb25ee13ec7ed6ba59c1f216",
  "data/maps.js": "cc115eae67162b5bc2677b8f77338901ab0345679d5cd9e6a6a3f41aff9f1e5d",
  "icons/icon-192.png": "c1e8a42f4760de72d5ba21a1d683111e137ab863893827b5c4e9ed2ceb86aaf2",
  "icons/icon-512.png": "f236786d645fb51e02640e919d146a79b8d47925599c924ccb86ef4ae34470c7",
  "icons/icon-maskable-512.png": "d209bbef68bf9c836b7675a99c297b45d7ec2d55a4b75736f042870ddd8e567d",
  "index.html": "fcd834c76990cf15f9b8ce2dc9acb969193cae72a7c6c9dab653932dbca33aab",
  "manifest.webmanifest": "e52e09ae050d75862cd4048e27a0480f2a2e128b32557c4debb4160aa3809f8e",
  "src/domain/autohunt.js": "f5e56aa4e1b13f613ea250142899f60f10b243a1e3fac695cdcb75e71d0cbece",
  "src/domain/boss.js": "91dafb0d88f42a8995c02ae5051e652521bc732ccc0991a8dd009bdde616e599",
  "src/domain/combat.js": "3c240ee1d513d0005c991f20cc00ce7f97cbdc8f3b80e80a77980a079788cfb6",
  "src/domain/common.js": "83ba9325f16ab5ba5ea447f958152d14fbf4624dc5abca32d285dd9d523f6294",
  "src/domain/compare.js": "a8aada1ebd05db575b8e35057afd92cb0279ab68ffe064682730214fa3600897",
  "src/domain/enchant.js": "87411943ee9d823df38735091d2835a334c4e3f231859fc4952d1f0497229c61",
  "src/domain/hotbar.js": "d2d17fc074f9a043bf97b724dfb9742191d3e5b580584e4750c7492a8e31bb33",
  "src/domain/inventory.js": "1bbd7c6d9a9c132a3370764cc70cef309963f64bc722fbbc671427d23ee2555b",
  "src/domain/path.js": "96e12b87b5e8843f0c38a03363cf4ab9ac8bc95fa3c166d668a65d0151ebc52f",
  "src/domain/progression.js": "1569fa95e7404660bfb654d1112ba3725a208e2fb0c359f3289d0643ed1dff40",
  "src/domain/rewards.js": "532de264fffbeb92036d567c45f78ff822a2c25a42b8e6f5be40e250bf8aad0b",
  "src/domain/rng.js": "bc81a7f7bebb527ce7ac3bd95485b408897f0378a5ab6effca64446e84f2ac88",
  "src/domain/save.js": "5e7150412fb693c8062d754c2ee25bd15e0057863b2cb554c98d33301d9505cf",
  "src/domain/skills.js": "0a608168dbe1771a7ed1b6a6ed00faa1bd124226054d3c1d3bb3b60a7dde26bd",
  "src/main.js": "885078cccfdd375c57959309aaeaa8891a670aedb88740298062703c22ac8dd1",
  "src/scenes/World.js": "f7b628d3776da4a7818fb6b70a147f4784a6ecb2325ddd23ceab08d1b42e0c49",
  "src/state.js": "ecef53df5ce23c8b0bccdf4c50ac48ecfd58a9d6f3df4f50ca11952d67e9b3fe",
  "src/ui/hud.css": "458338e9f62aaa1efe25a9cfd5887a9a81a6b474cfc45c2e5fbf0a6caedff65a",
  "src/ui/joystick.js": "0e41ee1f5fe089271522647719d2efe3793a207d5799fe964cb628fb17fda602",
  "src/ui/minimap.js": "d9da5373661ac42925847fd7a625cb369f1aaa51048678ef0d2644b93a293caa",
  "src/ui/prefs.js": "4df2c5ad458399c1978109b8014b4d1d03fa2803af251acfd659951f18035a18",
  "src/ui/skillfx.js": "aa483e74adccd0a55b3f8cafed139de3146d1156ae5a2f9cd0ff5ab01d4793c4",
  "src/ui/windows.js": "e82ef3275990c9bbdd77a8a2fb0e137c996848eaa3bc638154c50210f61a96e7",
  "src/ui/worldmap.js": "41081b6e8d47b51e7319baf4a2a025fff96f0c80de0b88f2a29f2c6918abbdd9",
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
