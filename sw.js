"use strict";

const VERSION = "43227e7df1aa";
const FILES = {
  ".nojekyll": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "assets/class_darkelf.png": "edabc5cb43c01135c1f7f99946b369841fdb1711a371796ad6c8e591e360f2ea",
  "assets/class_elf.png": "02a30f995f3b7bf2ffc125ddaaf649877fecb5e97037dd7a2731ab0e907731e4",
  "assets/class_knight.png": "975938aa2a6d8c3da61d8ed22ebb86b8d7038caa2e6d70eab268a70de8e6da29",
  "assets/class_wizard.png": "aedb2d77ecc2988c2ec6a8092976a4a6278ad30868676153cdf6de7cf620f020",
  "assets/coin.png": "ad1f568bc66eeac3b601d36350157f1ab1eb2d44f5e47e721c37870f10a1290f",
  "assets/fx_levelup.png": "d2435d5659d663b047a427599602b95a6ce0abf26bcbbf29f27469b532d867be",
  "assets/fx_return.png": "97f2918a318f7e0f051af4d6e7aafa37b29d01fb6dadbe1772fc8da2aee84d89",
  "assets/fx_slash.png": "faf5de591cd78a07b209ecfad4abda3a657663e7a5622a47f4f780e13e4d476f",
  "assets/fx_smoke.png": "206a9487b996a6d60a682e7a55923f27612f5331d53a587a19ad7b33e71a3814",
  "assets/hero.png": "c18d65e0b6b4cf9a60ccc2687234cfe6cfe8d361659bd9e559efe9c2d603c122",
  "assets/hero_darkelf.png": "8eb7b638ebc1dd287a91807b21536830089ade576e5b335675893a1c2b71ddb6",
  "assets/hero_elf.png": "603d147e033a7fe4abe5dc9faa59e5c72516667608eaf08cd8ff6549d8854979",
  "assets/hero_wizard.png": "8b4ed443b2ef7661aff9427ce60c2e092fa09f0ddfbef8ae46129def5ed31e5c",
  "assets/icons/armorScroll.png": "18b0b275c18584ae1badd43de89fc8d40b8dd48c1227ed3d3b82b5f9c17ec672",
  "assets/icons/armorScrollB.png": "0ec079934a2d5a26bcaa2a26791a17254a556815423b185ac4a739e307d35074",
  "assets/icons/beetleHelm.png": "ad88bbb3e6531400e95be5292699982f9fb23621a573e40d62d2f04fb4c80240",
  "assets/icons/belt1.png": "0af3258df38f4e2c0920c43894635dc6e58686641de75e5cc5fc6ef997477807",
  "assets/icons/belt1_r.png": "af8e019881d9ba1e6b5704e802b51e679e63c89ba0385e2b04d37a564e733881",
  "assets/icons/belt2.png": "ef751edc8694c96cf6945eb5dc1dbb00a85b1001035ef19ae2c30818e9f81fbd",
  "assets/icons/belt2_r.png": "1a7c9fdbcacf02f6292bf4a7eb0af2744fd6d6e52db3d36ecb20c75bdd51abec",
  "assets/icons/belt3.png": "738787034b097401ea7f6701a8af52a5c739ee9f4078fd2fc4f5f63a22b61be5",
  "assets/icons/belt3_r.png": "006c376e315eda558f9707afb50760aec6ca95d767d29480f40f88381b7381ef",
  "assets/icons/belt4.png": "6be50dc75bee22c1c32fc6ef497f7b07580ad8421fc52b3aff53ea55f8ebd7b7",
  "assets/icons/belt4_r.png": "83d8f24ed04422489f07e6bbe524ebec2e2950716c2a3ece2cee7f76a89ca9e3",
  "assets/icons/belt5.png": "1988dd1db6edb1bd97cb32a12c20df6119f3849f821b97363b868f9543d3ecf4",
  "assets/icons/belt5_r.png": "bbba53f49569c81ea593bc7d63b0397a537a9eb7d9361ae2af02687f3a7c5bdb",
  "assets/icons/blizzSword.png": "84165af2841b8a4dfe2320a4ae04eee963bd761c9f45edf9808756406d822ee9",
  "assets/icons/boots1.png": "a9f5072ed8f35fd29eacc98dda4c25a7d0807b7107ef006d5807aeb0ba5d2345",
  "assets/icons/boots1_r.png": "5569f6bde068092cc5a255f1686aec37f14dadfb54796c5df30abc3849f0a859",
  "assets/icons/boots2.png": "cbe91c5e0ba159c506f7049a622695e70237d8212035da5d33256d34e54a85bc",
  "assets/icons/boots2_r.png": "687e27076bb1ece96b6f0c797e70b0a363dbf2bb9cd6902c1ae59a3c1c032913",
  "assets/icons/boots3.png": "cb5629bddcfd205525530fb973bc664904d007a781b83fd5ef6963732f0092cd",
  "assets/icons/boots3_r.png": "dd7cb270f66488eca3a7c5fce378108d0734a0451982c21d84f255e58c6c1145",
  "assets/icons/boots4.png": "620e78dcfc7e6dc7fb89d2e0d38b180e0062a993356f0a28992a6e00c0e0ccf3",
  "assets/icons/boots4_r.png": "cf4faf2bf96d380988c99579806749bf529cdd89391588197f29fd5bf7f755bc",
  "assets/icons/boots5.png": "7fc400ec43d0903311de3037cff9e593ed0823777e668fac89954afbfd9e2a8d",
  "assets/icons/boots5_r.png": "5fee3006019a20c1b3708134abef4b2bb4cb49489987af17ff6d491861041f80",
  "assets/icons/bossCoin.png": "44ec513ea03f988a3ac6f8c37a8807a7d869bf2a26b1b4967af2bb31ec8ce500",
  "assets/icons/card_bash.png": "da50ce15cb24cc4cd4964512752d92d54a2b23e320179b0879bf90f7c1b01f6f",
  "assets/icons/card_block.png": "fcf1ed52f75d488b31408d3cb0cdcf209ab4089a356fefdbc44f8fbc5a4c5f1a",
  "assets/icons/card_counter.png": "802dc27aef00f79d018288d7cc9d990bc3829c04a55419c90a25e6dd550d4a2a",
  "assets/icons/card_dash.png": "fcecdf4a516ab3fe5134291a48e7c0572023a0f45e1b2d72d9caeff73883bfd1",
  "assets/icons/card_guard.png": "2b9eb7e81784c55abd7c57a0027e13a3e8592774b8a169cbab498b694cec01ec",
  "assets/icons/card_heal.png": "2d548f6c341ad86f2422cf12eee0edd1198bf41a96d0efc2ae0a18aaa2ea735d",
  "assets/icons/card_quake.png": "68abb0710a76b8f9e9b6646eb434940995123227480b4eac906143af8091142e",
  "assets/icons/card_stun.png": "e3c2ce3aa809bd4cdc4372a8a2422db3dbac4ea013af8e7dd90080cff2d43f0a",
  "assets/icons/card_ult.png": "7af3702e4510a094519317c2e197f12b14aa58766dc5ae7cce68c3a00dc33485",
  "assets/icons/card_whirl.png": "5541ce8188011a413ad4ad9b3079eb576c9ce06ada38e81757c3216d23a7219c",
  "assets/icons/chainArmor.png": "7374d9919780eb0aff55f358ea7a0b2a3b2afdc76e4dff200a3d87196fc91e79",
  "assets/icons/chainArmor_r.png": "738000c7a805f43a8fa414e610ac64638b82b3aef13949fc0458d77ac6c50f68",
  "assets/icons/cloak1.png": "7bc71a0691155367bb4bec4de64b8b20f220f4027f025fb46496fa9aaa537663",
  "assets/icons/cloak1_r.png": "00d8e3a918a0a6befd21c8d01dc1bb5fc51e27fe9d6352b7e0b562285cbcdfa1",
  "assets/icons/cloak2.png": "b24f3bd61d5fd8d2c035d17a04b61178333290732aa14c328fdeaba7417a31b7",
  "assets/icons/cloak2_r.png": "b63ba43e832f55d78651d697802fc661e4ad788f5bb7785608bab66b49ba3ae1",
  "assets/icons/cloak3.png": "a20d68f3ffe9f4cdaf4fbb4fce994fffb14cf9cbb1fbf3a5b6a55511aa6be721",
  "assets/icons/cloak3_r.png": "c3b91410ef50d8aaad223bf0872e3d8c5c55c9a06dccc7d378a35da96caf0606",
  "assets/icons/cloak4.png": "d004d23cdc498c2e20a208931bcf5b48cda9f4a8cea2bae822c408ba0498d22f",
  "assets/icons/cloak4_r.png": "c65bfb6c125e55b83001890bc34a002ed76bc81d5438741a75e0db5d96cdcc8c",
  "assets/icons/cloak5.png": "eed117e48dc058dd4253f5ffe71b0aab4de1c9cad739e750cfaa3bd796caf075",
  "assets/icons/cloak5_r.png": "aef9778abf72df437ea57beff7f78dd475ea9aa751a569d61f3102097b20ac77",
  "assets/icons/clothArmor.png": "5ea88869a03e73877c10cdbba5424e7c62dc8448175ae99240d37517b050350b",
  "assets/icons/crabArmor.png": "8e0cb3c630c8c0b0ae1d74e92aa24d4eecb52c7c7c271be9764960521d1ba73b",
  "assets/icons/deepAxe.png": "174cf376444aab46a6c637f6acd7f2378c260cfb23fd57f9ee90b9214850aa49",
  "assets/icons/deepAxe_r.png": "185e732233f18df061ada1a25892a0f114c07e596c7799e75250feee1ae50407",
  "assets/icons/deepBow.png": "06389dc38caab69e05fc960a539385e39ea8702796103142175069d61b78f35f",
  "assets/icons/deepBow_r.png": "271f217ee86524548d2a31e399dcfab16197a52345182e24f1f282446365e836",
  "assets/icons/deepClaw.png": "2c56d73c4fc82e2e8d76cfc4ae3b7883a23f22c588bf768a3d5a7105a3c08c99",
  "assets/icons/deepClaw_r.png": "97eae56b2ca33f3ce2d97cb176e1ed0c13f76ccc06c5fb0bd4b082501fc7ebdd",
  "assets/icons/deepDagger.png": "3278912eb41a445bc567b4cfb97c58071a969eb7373c28664a130b9674590dc5",
  "assets/icons/deepDagger_r.png": "99aa3a26f63ab16599a6c11ba526416387ce6a94150dded198cbfe1f4e644557",
  "assets/icons/deepDual.png": "679b37f4732b93849a3b2cc29bb24a2ced39988e03c1b73c986b9354882f0866",
  "assets/icons/deepDual_r.png": "5f0fd89b1622033dbf41be7437ffa7c06530d9d6074db2a4a9610d4586afac2e",
  "assets/icons/deepGreatsword.png": "bdb020a313956713eb8522b85abeadc9a278144c63fbc828cf308a81bb4ea0e8",
  "assets/icons/deepGreatsword_r.png": "dcc603db430b15268f956a9942e170d7679e86919bce5e2f800a355c841e0141",
  "assets/icons/deepSpear.png": "ab9407c6bc3d817187ffcac71a2ccd784dddbe3253541c96f237ea126e478fee",
  "assets/icons/deepSpear_r.png": "86ef79d3d2d02b2e3486896a680342133802ed8f498c96f2d6df75e411cd3433",
  "assets/icons/deepStaff.png": "41309083e8b96b1f8782497b20db32269fa0026074a818d73f3bd681efd73cdc",
  "assets/icons/deepStaff_r.png": "06f24f756637be2954627bdaef78b39d8b0884b26a409320e94ebffc0d8d1c30",
  "assets/icons/deepSword.png": "2382d8ad90d81001a4d30b7802251ffb04d5cff231b5214c4b85f5aee1dcce67",
  "assets/icons/deepSword_r.png": "c6270a588021c1f5639faf50cbd81aac7c0feb05d34ae9f4ef7e2d7eb36522fc",
  "assets/icons/dollBox.png": "241805cb23b5ff52cf945733113a7af206b078a83982559370cbf5babda3fc68",
  "assets/icons/downScroll.png": "204ded4606feb81ccda1b0ec7747193327e3ac07953a4a5b78e8b4b69a68c014",
  "assets/icons/drakeArmor.png": "ec730ddb69c63bc3b0b22e14f5d29bda365a8e99a7ac36f8629cb4f71fffc57c",
  "assets/icons/drakeBow.png": "b0ecfee4b868c6a882035f120816a7ae57ec3e6e39c98088fc01711f98cce2be",
  "assets/icons/drakeClaw.png": "935dd9e86495de1566793874a8a487c49f8bcdab1aa4df131f61efd9d723878f",
  "assets/icons/drakeNeck.png": "4c52c5dd288c0e59d852adc8996fdef7372db9cf5cbb97d1148425c45b65423d",
  "assets/icons/drakeStaff.png": "034309410c9d158431f9659a4b0c4be23f1aac92a414ab56403da93c0f872124",
  "assets/icons/drakeSword.png": "a8ec2e6dae8d98126cabf2db0d18a4f13a096723508c9da203a2568a284e5670",
  "assets/icons/ear1.png": "e0888977bdb698adae3fee646fb65fa1aa633fd99551e4f2dfb5e8aa3eacd70b",
  "assets/icons/ear2.png": "bf18e002af0c84ce5a7a56929d3726a187d78e7dbba4aae83fdabff24cad73f9",
  "assets/icons/ear3.png": "81ffd907e6b9dbc0b32510dbc47b1f7153d1043188f4d84705b82b4112fa87fd",
  "assets/icons/ear4.png": "b39de0a2e41977911c2bc63755be62aca3200cce754e2fc69206777fddc66d85",
  "assets/icons/ear5.png": "5e1dfe0bfce93313ad2c34418a47a144144e05ae73d08338be64bc352f02292b",
  "assets/icons/echoBoots.png": "56a391ff00ae95efb53b53a93364342218c9f71d6e585d76fa2ac649522a0077",
  "assets/icons/elixirCon.png": "0fe8041d0a1cde6aa85089b9e37fcfd530ca432dde4189274056652d876fbb5a",
  "assets/icons/elixirDex.png": "eb10e927c88a412d399c759a9f42c13961a4708e6149cf3e06ab4f4a3ced1fce",
  "assets/icons/elixirStr.png": "833246d656459a4d335838ae9424535e47486036dadd20d01585a22ab9fa8bed",
  "assets/icons/emberAxe.png": "35ab25d39f0d11fef1efe226eb08863b22a8e8588154729a54250e980d3e5710",
  "assets/icons/expScroll.png": "141bcb95d014e2da410ab9a623005e204cd2c85c63ea5a54dad45b6459b349b7",
  "assets/icons/eyeRing.png": "df72918ee06aaed29a0ae7e20c50c173157cf343b30e21fe5eac73b9e1ede5e3",
  "assets/icons/frogCloak.png": "032a774caafc6a322a2b4b95ef6b8f2f69f830d3b237735fab575d3d9e65f7ec",
  "assets/icons/frostArmor.png": "88426a444bcb4a6a73a550f5860a93d1d65a53a7463a8b79bda715bf2cb65b7c",
  "assets/icons/frostArmor_h.png": "3ad43116b77d90ddcf3162958a93c64131e9bcb3b9f3d84f1898d92f55f99a32",
  "assets/icons/frostArmor_l.png": "066f48a7c261d8c6ebd3d9fde44406fa2cbf7d76b0b8daaf5d3684c680465b42",
  "assets/icons/frostArmor_r.png": "1ff97933e9c18509e40b626998f8d2c47242c5ff6a2c379859d1bda5a51fb6a8",
  "assets/icons/frostAxe.png": "07e8487a18e7dad348dd488653ed821b25cc6cb539de3492b837357a61bb4955",
  "assets/icons/frostAxe_h.png": "546805f2f85b95414c6ea10c9c7861103227c49541547e7dc31ff9ee5df0f2b3",
  "assets/icons/frostAxe_l.png": "14f8a772f98a27665f39036a0cf77b6af81a6289d77ecdfd9cad954229421683",
  "assets/icons/frostAxe_r.png": "7e8eb2263e90918721e5ca5b764ad2ac74e84364c922870e85186b58dd923ed9",
  "assets/icons/frostBow.png": "d8ea58b955cfc056dc33a83797e14ef801761084936cd54c42f34f055027d0c3",
  "assets/icons/frostBow_h.png": "dd877703868598d618fd51db296984f75331e9deeda8b51dd18bdfeaad8f73b6",
  "assets/icons/frostBow_l.png": "671a53121aa6b1af353738a2e663313e9b0f1669473c35be812e11ae1e6ef6bd",
  "assets/icons/frostBow_r.png": "2e782a9d34c81bedd3b7d87f6c9b95fab6365937eb19f8748d7c7131a6d79402",
  "assets/icons/frostClaw.png": "910954649ccb78467fb703f21c3d5e01245fd3b4ad5dd73d8b1498b4965f893a",
  "assets/icons/frostClaw_h.png": "38cca9d856c87ec77ed110345a2c9cf19a5adfd4a440b840a0a5e710a69cfd37",
  "assets/icons/frostClaw_l.png": "5b7c5d00455b345f3c6c956e84fd0aabbf8743d59575ddbc96d1ba84aa91dbcc",
  "assets/icons/frostClaw_r.png": "76e6d3104ee2ff1c0c197988669ee76841c725cf7bc9e2e0ec0fd84adc567f62",
  "assets/icons/frostDagger.png": "cf26aba3d0162d75cc7bcb3dbff803338d95dafbe28a5badf9a4fdb5f94b03cd",
  "assets/icons/frostDagger_h.png": "574889c25fd6b11ce314a1e0821b4642db81c231b9af36e87995978c6d8e0e43",
  "assets/icons/frostDagger_l.png": "6470e5b646dda4c0e88606ac01b8fc3387bff7eec5be694870232ea7c9d1d1bc",
  "assets/icons/frostDagger_r.png": "285761bfdb59bb406d096aeef052705e740529decf59e51c6ad76083be548caa",
  "assets/icons/frostDual.png": "ce3c93bcc0290535e2b145a380b892f77d290060e1981d0b99b7d75322145b85",
  "assets/icons/frostDual_h.png": "7afbc88c437adafa393eadd3d140b73f413736e3087780ff5e6010ab00f1dbc4",
  "assets/icons/frostDual_l.png": "c450f967946fb86e973910f1f57507a7147c6089e495cee64093b6984ebc6c52",
  "assets/icons/frostDual_r.png": "cce6236a68f5b2ceadf5dcaa41fdc21d644bfb3c6c3537cc65043600f9c508dd",
  "assets/icons/frostGreatsword.png": "e9df61c2b6ea4556487a41787d69fbab9703d1858e36d31e3027feea52604f3f",
  "assets/icons/frostGreatsword_h.png": "01dc93cbfb2b9f96ab10d7f2ffd7342ea711b8073581d01ad130243c1bb1dcef",
  "assets/icons/frostGreatsword_l.png": "d3c88e341c511beede894e56ff4b9f7a58f86a3f9c5e98916c91349322643d71",
  "assets/icons/frostGreatsword_r.png": "9c8efe7a73bc1e2c05ad9b987e8e297aec5fbef918fb8200a1acd2462762984a",
  "assets/icons/frostSpear.png": "d889bb9d0205a05c231376bae171ea103a06311b51a92a3bf874b75689dfc134",
  "assets/icons/frostSpear_h.png": "8ab7d7bbec39646648ba96bf134694e6933d2491295963eb56a9614b8b8f4c93",
  "assets/icons/frostSpear_l.png": "43bdf58c25b5cff89de1b1a22ebb02520c975a827bcbdf56b6727c9144235570",
  "assets/icons/frostSpear_r.png": "477bc0995b98d1f3eeadb382e410d06704b935faf7fc86be809f7b1fff929016",
  "assets/icons/frostStaff.png": "0db4855f9aead280bf8201a77632b3e4eee13f0dbb9ac1a3b654339f4ab3741c",
  "assets/icons/frostStaff_h.png": "326cb5e80a050f7c64c423588a4460d5fb97f770023b4b8682cf60397e7cf966",
  "assets/icons/frostStaff_l.png": "dc0eb14154a8bc6fe9bf413684faba2197b7a353923479a8e4fcc51eee5e46d6",
  "assets/icons/frostStaff_r.png": "4fa35c6ea7447634e4f6bfb78fd170da46e5d8715fa9ae4964153507d4252d2e",
  "assets/icons/frostSword.png": "5c16bc2d0b15a2301189bdc8aa93431dbfb462e1f5d712645ce15848cb8bf7aa",
  "assets/icons/frostSword_h.png": "79aa810f8ce997889dc17ddf0310f322940cd9e39e5d9d906f766665a1bfbb92",
  "assets/icons/frostSword_l.png": "c5f05e31c53b59c456f56a163bda78118395a4f886b49095e0fcd8ae987691e6",
  "assets/icons/frostSword_r.png": "072e16ac1989eeb86c86a4d2755a6195eff9b62b77a77059d83295aa1e6c52ca",
  "assets/icons/frostWrist.png": "2cf5813e636f6a857d3379d49ca0995347f180f6e323212aff2ec76526f44a70",
  "assets/icons/gloves1.png": "af73e16b53b72660154da3573d64c98746570a054d0621a86a6c8b6b56686929",
  "assets/icons/gloves1_r.png": "669a8e890294324a060e0b21dc0d7dfa7c519fe5f7aebc484823ed1d45bf3c0b",
  "assets/icons/gloves2.png": "ad3b130de6f432ac0b796fb53358d416c5a0c3507b1ae406266b0f8ccfe63308",
  "assets/icons/gloves2_r.png": "bd0033052b8ae9528db8ddadb3b75261283ab4bf508ae4b2bf35211c63e87928",
  "assets/icons/gloves3.png": "7d5a7331d917bd5ec67f4f652043f085c5bacd99b980e89bcc0965ee30729757",
  "assets/icons/gloves3_r.png": "53a75f4be1589799cb3e6f31542e4413575f24b3ab63853a2a3218f7d7fa13ee",
  "assets/icons/gloves4.png": "f45cf59e82f0757c17daf30ada524c2c7d59eff6cbc1d1ca2667c4187f234745",
  "assets/icons/gloves4_r.png": "9762a5e060ca084027f5a668301ad6a532892c4561a011b1706200a8aaedf362",
  "assets/icons/gloves5.png": "272a68350969556d304510140fd80b1ddb9768ad7f353ab18f21cd05161f615e",
  "assets/icons/gloves5_r.png": "c8d760f0ec140f8c241f61fa368d7dd8082e3a3714cefce4209564becb1e94c9",
  "assets/icons/goblinHelm.png": "bf130f71cd575ddf0e7b9d9bad3b34503133ada65d0e83056d0c57bffd7592cf",
  "assets/icons/guardPotion.png": "39a92fbb30825d0122c5701ad3f6794784e806a0c4df65444e77cb527c8db333",
  "assets/icons/hastePotion.png": "f55b3aa771f63bb68bec0f824863c6e409f34f558b41266eab861cf70a08f542",
  "assets/icons/helm1.png": "fdeee5bc76c124185c3758bb898e184ce7a61c23246b013598a7fe0c7d5999a1",
  "assets/icons/helm1_r.png": "3c5dac9ad56719800742bbf8bb1d24911398fb47fcdca2194496becf223efded",
  "assets/icons/helm2.png": "cbd7a083c715a4b47cdefc75d4eafc1878f90475ec7f0e7848af1c422845eed9",
  "assets/icons/helm2_r.png": "34b9b78942bf0e3c347d8cfdb4c997d7d45f5ce9f7bc12805c63ac1e1af18cff",
  "assets/icons/helm3.png": "3481045636c23f5d7e1af2aee4b86563ae8e1f70c44198b8e4213531c8feb780",
  "assets/icons/helm3_r.png": "155610c3d43edf2b272c8758459c4be475f03891e2373820dc2a96ad4834943d",
  "assets/icons/helm4.png": "6439c2edb4c0137456e5a467e009e564fdbda6b6ef6df37e6bb5a8391e01cbb8",
  "assets/icons/helm4_r.png": "2eef6ec61adec2ff2bc66b9d37f4f2221f78ebdded824a665cdc368abc1441d1",
  "assets/icons/helm5.png": "6d95fd5fc08459cf38e1e8813b92f12bdc110cc0cf07fa3f9f968e65dc243af1",
  "assets/icons/helm5_r.png": "30583e50f17b719e7554f3261e7c5eb9a410ab2987d4b7d4337c929608755079",
  "assets/icons/huntScroll.png": "7c6be2eefba0871dd7630e947e9ddaef0888cb63e1e42839eae502cfcda7c3ae",
  "assets/icons/ironAxe.png": "56e7fd3773fc8d09f8ffd8f351ebb9a4453d48c551d9e8d8578e4c41f6968171",
  "assets/icons/ironAxe_r.png": "0efea27a7236abb46ac2bcb673bc5d55769fbbd741c45998f3e95aed0be954f8",
  "assets/icons/ironBow.png": "a5bd05abbd035d92e245ca26b9d3b2fee259969bf98bf2b1c53969ee041cbe0c",
  "assets/icons/ironBow_r.png": "586c680c7e5e33c85c360fabff0ccc7a0266b6c6caf5dacb49e77b0263104e76",
  "assets/icons/ironClaw.png": "0c8bd0783299c5bac5873a24525499f145eb0a27981e747337874218701d47a0",
  "assets/icons/ironClaw_r.png": "0b7af0eae21b4199015bde1c9a5d7236dfa715236ed399a127d5573f4f228cf7",
  "assets/icons/ironDagger.png": "c2554d3af7fd373b78fec8712144a37d3a1f23f265d57429068ceb1ecca9685a",
  "assets/icons/ironDagger_r.png": "d0cb3214731ece31dd90dd90975c094bda81ac3ddc88800f09118bacd98dd50f",
  "assets/icons/ironDual.png": "336a2d35efac7d6caa81bb8910ccb0bffe7d68d32426b5ffa6ecc0f26fd24fbe",
  "assets/icons/ironDual_r.png": "d714b29998639a6bf611f1f7ec98c68dbf8592ea1b138cb334dd97e6b99c9cae",
  "assets/icons/ironGreatsword.png": "96508550dafc4076293b6722b8063f57aa70015c973d5393a1a54ca5277bde46",
  "assets/icons/ironGreatsword_r.png": "980f745e230e6c593d2390fd412a0f46018fd807183f38319153ee5ee07fc896",
  "assets/icons/ironSpear.png": "4ee36f2c396884151484e066a20c7faff7c0fd163c9de52c13139cd9d5fb512a",
  "assets/icons/ironSpear_r.png": "2cc2e14c33eed1c9160e7f475a1f707b8eb48f513f956445cabe2ce396eeb734",
  "assets/icons/ironStaff.png": "9bffb9e5113e58d453bbaead1101b322485be91fafd67b4fc33d67cf6204e187",
  "assets/icons/ironStaff_r.png": "25f7ae7d935c7fd9ff56aed44ec9a76ff3500ba885907ccec8ada16669934d8f",
  "assets/icons/ironSword.png": "22553319f5a9c3494fce8a6d1170c8b5bbcad175ecd0caa9f52e22d7a2c5067e",
  "assets/icons/ironSword_r.png": "ed1caaddf81c25dc4fc22db081398d80e9d4e8c122f7ac4d274ccab4902d8f7e",
  "assets/icons/jellyRing.png": "1049ab262c1f93616dea40ee42816e9c50a30469959137177fcd5f586525cda8",
  "assets/icons/leatherArmor.png": "9bcbf38df45c9a88120c025cfdcad4b9a1b71c8b1f4bc04000694f7348c735c7",
  "assets/icons/leatherArmor_r.png": "22be71e40e394c4528e9755eb6a3bd7f308ef39b9d6944f8c489611c0b7a4261",
  "assets/icons/lichCloak.png": "e3161f651389cef29e67c14f1f5d9e659408b01187a5842d14bc45d09df4cc33",
  "assets/icons/lightArmor1.png": "b9eaf88085f2fb734b5c2433beba8a3df1782e9445cb3d93235a67639924ed46",
  "assets/icons/lightArmor2.png": "04b9d1a1a766a5c389fc9fcd434102f7662fc5c1bd09b906f6e0e85c58a34605",
  "assets/icons/lightArmor3.png": "6e6d55372a5eb2a8d4f98e95d773e0efebffcacc5e4bf6e5a4edabad918b3da1",
  "assets/icons/lightArmor4.png": "dd008ca406c8691038da4c59649eb95fcd650223e2800b7c9924f8c12c089949",
  "assets/icons/lightArmor5.png": "3b2052c33e185c4af59f894b47712997a0592ef95c37862f4a04e55c6f8137e5",
  "assets/icons/map.png": "bd2ebea34e83eb3e03f15dc0524c9f4d5ddc60b25202944ea12ad4324321da1c",
  "assets/icons/mithrilArmor.png": "067a1f854739a76387d6a4571859a4df23191cc14d3767862db5e9e72874fbc1",
  "assets/icons/mithrilArmor_h.png": "846655613d2c5e6fe63be1431186f37cf567505740cc2acab48e47eb425264c1",
  "assets/icons/mithrilArmor_l.png": "64b3256e5907253b75dfbe785506fa88829e5d6c4382a816d658591a11437c75",
  "assets/icons/mithrilArmor_r.png": "c030689a735f0bacc676df0cf76835f41771b139c31839d78ee77d6d3ee352bf",
  "assets/icons/mithrilAxe.png": "71b582cf39041239af5eeafef748df88e44bce7ed44635e3224ea36b6eb0f9ac",
  "assets/icons/mithrilAxe_h.png": "2dc47aeef4e218bceebe4ddbb09bead04224de73f67d8963bd696af8542eeac0",
  "assets/icons/mithrilAxe_l.png": "bd9181ef38ddb7ab1e2675e04c1c2838f07fcf79809252bfff0969590e08df50",
  "assets/icons/mithrilAxe_r.png": "a3ea7db8389214831465a7a3584f2df26f25be00bce677dc7a10cfcbea558206",
  "assets/icons/mithrilBow.png": "505aa3a44b566e7827bfca8ee306a85d6259e73805a8072eb560392df54effb7",
  "assets/icons/mithrilBow_h.png": "9fe7739ef5f9da67b3a45bd8201fc626d0fcf6c133cbee6fc034a18bc41b34d0",
  "assets/icons/mithrilBow_l.png": "8b8fbb88a7d11e676a91d3467afcb1578857655f27268a3c50a73e610df62660",
  "assets/icons/mithrilBow_r.png": "9e3d96de7b9324c47071d4d12d95b09cb41f56c9759777d460001e8ead39d6cb",
  "assets/icons/mithrilClaw.png": "92e0d6d5d9776f428213ae07bc39a2336b56c2fc8045347e75efdf24fa0f168a",
  "assets/icons/mithrilClaw_h.png": "9759c584fb6c75aef88409a51448c944dd22da383fdcd80b4562f94b87da9200",
  "assets/icons/mithrilClaw_l.png": "a0b66bd72a9ad5839764305dd6ca5739d845e316b3a436b14c48eaf6926b6363",
  "assets/icons/mithrilClaw_r.png": "bae3d92469d439af944bea6d0813e1f497348f5ceb2c59f08222b73389edba03",
  "assets/icons/mithrilDagger.png": "26eababe89256322422106eb84ae061bd33ce66e82abcedff7c0a7245a81d296",
  "assets/icons/mithrilDagger_h.png": "b629336cd8f44abdd957fff8c938dcd2353cd453e44060679b136471be21bf3c",
  "assets/icons/mithrilDagger_l.png": "18cc77692fc7a5067aec9b466c976b52a0c9c43fccda7fa94067b75c4e444229",
  "assets/icons/mithrilDagger_r.png": "cbc0020c8f348cf274b80f39dd62a501306bd3414a94721fb2b1dff2b6bd0b45",
  "assets/icons/mithrilDual.png": "e3ef99c6477ed9d82404e70fb7de471ec8f211cd57de7bd30ef8a01a4ac34bed",
  "assets/icons/mithrilDual_h.png": "c7e0489516877969b07d056d2d84d1e0e84850e71bb2d2bd9ca820961c48fdb2",
  "assets/icons/mithrilDual_l.png": "e821cba2d00d2ca74b55fd366df981a0e993b0f188e99eaf3f3cc8373a14910e",
  "assets/icons/mithrilDual_r.png": "75964ab2a290ef1faf728fc7c78773866e50f3dd97d28eef1c230fb1fcef7038",
  "assets/icons/mithrilGreatsword.png": "489f64c759774e2d0b2c9311707dd97fc243d90c13d460269a6eeea73946f373",
  "assets/icons/mithrilGreatsword_h.png": "2cc5dc356542b30591e7337d1e2146784c53b60a9d51b5f19dfb5fba0a5de7ca",
  "assets/icons/mithrilGreatsword_l.png": "cfe0d1434929c8f7434cfaf771a3b0529f6a683ec9c7607ad0c41560a14efd1d",
  "assets/icons/mithrilGreatsword_r.png": "f4300b6c4ad94affd180e75b642a07558c380ab11ec8bc4dd4938f3122e44f1f",
  "assets/icons/mithrilSpear.png": "a327aadb8215cd4ead9a3afc25e064a01afcf4c45cb0f1e3f092151aa9e357ba",
  "assets/icons/mithrilSpear_h.png": "258b3c4ccd0b0fda7f850e6bc38c81180afed5abcdb3de5e744ad3e5961e13fb",
  "assets/icons/mithrilSpear_l.png": "00ffe8514d026bcac8cc9f7fe29d48f4899e2e233413aa3c828de691067e7165",
  "assets/icons/mithrilSpear_r.png": "55f7f047dbb174e37dc8cc4dcaeca9e27688d432cdc692baa873016a061fff0b",
  "assets/icons/mithrilStaff.png": "d160344c2b8ef3a7fe69b146b2264809578e080c68715b9dd012c0474be5d947",
  "assets/icons/mithrilStaff_h.png": "13550339a83cea79d0e7aa22ce53f5b5b8319dadcbedd6048fedc0c67e65af57",
  "assets/icons/mithrilStaff_l.png": "765ae7e50e467dadb401cad15091f88b3f5cd36e7660ba093c9756beabf00649",
  "assets/icons/mithrilStaff_r.png": "d2986788cc82c82ada71c3b631c893355dc5a09cbc182ef883bea8c45f42fcaf",
  "assets/icons/mithrilSword.png": "b7daad8a28e66e456332c79d1dd33988b1ac47f82d87cafa8b29b741fe6ab022",
  "assets/icons/mithrilSword_h.png": "fb366d760fcc99f052de030ba250bf23abb01b96070011a8104848e1675b3dd6",
  "assets/icons/mithrilSword_l.png": "c418c3f85c17075f3f3d3c36103eea96d44e99a973c194d328f0b694cbcd9185",
  "assets/icons/mithrilSword_r.png": "d859bc2439849b1c5ced049776b01bdb0e30baeeeec04741e9806ac938cf63bf",
  "assets/icons/morphScroll.png": "317d3f6dfdb81c3a9a66762ca5c74f6070d83e7f749749dc0501d35ec6d1b72b",
  "assets/icons/mouseBoots.png": "3585dcf7cb4f853a76065aa826d918940116b0e3e6f6d472a4e5cbf229fe842c",
  "assets/icons/neck1.png": "5d1e5db19dfeaa9ca4f67b3cbb776296da79ef86acad31d665816dfa74fdcad9",
  "assets/icons/neck2.png": "c13a6d1b75ef756ffb5b775e973b5f1b867c5f66b26086279fc60ab1b591e773",
  "assets/icons/neck3.png": "bbd435eb6e85ddd504926ec89189fb2adc8416f6688e2a1242e5872477e672d2",
  "assets/icons/neck4.png": "37cc1706a18ad3f4bfaef3150150b786c4ecc062d74216df291134557dfe051e",
  "assets/icons/neck5.png": "be285918a2c0ad412185baa27080a9c7577dd68ad30b8f49798a8bc1a4904013",
  "assets/icons/nightDagger.png": "ca57a06cbbce5c936b6b9e236b970f8757bd4572136e11944ea1a41510eaf591",
  "assets/icons/pants1.png": "0e3af422d576482c2f4354801a318efd61f08ccbb0f7f57acc2a1bd231d216bc",
  "assets/icons/pants1_r.png": "e6753ad62cb43e5813b6bb5e6b18ad012b8506bd5167dd0c82520650ed988994",
  "assets/icons/pants2.png": "e27b5a0cc196d1f9bf0a85d908b1bfe12fec8f892eb230f6118fcad17b453f30",
  "assets/icons/pants2_r.png": "2bfa598c27132a05aaf03b36d5d21ef6172cabac934030a9502aff4b6c74c69c",
  "assets/icons/pants3.png": "bca17ccc3f96d3f4691692b20acb5bdf126d9a6af6679eec19ecd3b938b76bc9",
  "assets/icons/pants3_r.png": "ada211408df26512896b1758c1ef3293b82fd95fba4992027858c51ee5e002e7",
  "assets/icons/pants4.png": "dca5960141a0b0f5c8d8528f33119e15611d46b66a4b12451adbc6885747fe46",
  "assets/icons/pants4_r.png": "4647bd85e7875981a390164b371bc1779d7411f1d09360db701b4eb808dfbb2c",
  "assets/icons/pants5.png": "02e41d7043138b883151324ded04cd1744b376ca8ba16cf7fe1db0e7823ea1a8",
  "assets/icons/pants5_r.png": "ad3d28d315e34b23e8dbdf49da5f88ebbd31dcab5ccd7c0391edd201de79c14f",
  "assets/icons/plateArmor.png": "81760da63cbc72297b1a0df0113e6e0911457eeb62a0a2d5c46d39ab7185ca66",
  "assets/icons/plateArmor_r.png": "1f300a8fafcde7756bfc764546bbdd12fd5922f1aac3ef72e34bb1b690e5bbda",
  "assets/icons/potion.png": "217d036eae8bc50dd8dda11f0637ed9e2b359f97fa6d3cdccc77625884232299",
  "assets/icons/potionHigh.png": "dadca29ac4707fcc3af6d401161c587926196e9ca4fa67b65b5ae057680b1e9b",
  "assets/icons/potionMid.png": "db639a6b1d23d14a9564ad56e68eb4a55444c14809220b48446991cf938d4219",
  "assets/icons/potionSuper.png": "6ae6ce2fabcfa366d0bb8c4c61c49a32b495eb4bac36efc3af984508d9a88f2e",
  "assets/icons/powerPotion.png": "e5bc1664540cb2daff44464bc8add027179d22c73f8bcb9a12a46bf8b93698fc",
  "assets/icons/raccoonNeck.png": "bda75485e7b41a1d854ab222901b164e22007dc139f5976ea86bc3f0b86519a1",
  "assets/icons/rates.png": "c2a98df71f3aa27e05b89ebe4a4ddc15d11fdeb0b2f1a0f08fe4cf88c9acc1af",
  "assets/icons/returnScroll.png": "7b0ebc0bdcd2cc5b3f6937f67f8f1f6b665c6f17573a6565e74d1e393afcf246",
  "assets/icons/ring1.png": "42a4e2f872201dcb0fc596eacc16ac4e5661610798ea1c797d155da6d00539d8",
  "assets/icons/ring2.png": "315bc33b52c0132306f82ecd34d4dcfcd02ce2896955a81a4093e7a14c5c78c8",
  "assets/icons/ring3.png": "429eca30a4019de97cf3936dd38a7229aefacfc2ff771192cb60feb6df3a6abf",
  "assets/icons/ring4.png": "7fb54afc220bc217cfb21952ab72f6741a95dc210d325c9c80ddce341bb50611",
  "assets/icons/ring5.png": "b8f77661bdf9758280c1538d541896c5ee4783a3898495221d02b84dd8345113",
  "assets/icons/robeArmor1.png": "b7ea3ea56f521f67fbafee9d5c145f3b189e80a062df0159769bb19119567da4",
  "assets/icons/robeArmor2.png": "41a1d635ace56727ea2165e44b63102126d30c2f6e93195fc64fca142ab33ed4",
  "assets/icons/robeArmor3.png": "361aacef4eb1179eab9337c24f1911386939609e7df86fdb46443bbb4bd1b435",
  "assets/icons/robeArmor4.png": "278b0fec96645e65f7f908ce5509d5f93854fb571e27b532dc13074e8ace65b9",
  "assets/icons/robeArmor5.png": "d10a2f18b2d93aa22ff427b40ced5242bbe0b33f72fae7ce5233e3c35f9d1dac",
  "assets/icons/shadowGloves.png": "fa1b328ffaebb97d41819ba7b9149f6cecef13dfd89a0b123141d7fcd9ca3054",
  "assets/icons/shirt1.png": "a9afd6d339588d6ca0f278f78976cf0b6040a1e88f1cbf8000ae5ecf96577023",
  "assets/icons/shirt1_r.png": "0d1a6dbaadf0b12c1f81a0fc87c9043317f67fb67936127a16fb2308bf868f5a",
  "assets/icons/shirt2.png": "0c2b43f95ddaf23aa6b13af8edde2a819d7c01c54ae8d2fff5e5366bae77defe",
  "assets/icons/shirt2_r.png": "12572fcd27227e94586de2bc46cb7270c3472d00f66c3429dcb746bffadc7507",
  "assets/icons/shirt3.png": "3e6ef114b23b8531659c282ed832e2cce01c1981e76e1ef7941215967cc3d93d",
  "assets/icons/shirt3_r.png": "992d8648f5043b65cc6abc22a3511b3c6f657e37d8659a3768efe34bf723e5f3",
  "assets/icons/shirt4.png": "ce42d4a293f75bfa808567912e141d382279f76f0ad60dc25597d57f35d4105f",
  "assets/icons/shirt4_r.png": "5bbb2c59d2d31297fb29f55693a41d9276f0240306b0647e25cd837bb35e57ac",
  "assets/icons/shirt5.png": "51b5dde40056028b8fc83ab20ada3b0a0b815fadfec01a9d0cff150278fe4359",
  "assets/icons/shirt5_r.png": "29dcccbf704e98b0eb6d07eae99ad74bb162e394bb3a6d495c3222b81614e0f2",
  "assets/icons/sk_bash.png": "49d9142649365a443c9b02c468de746d0a12fb1e4e9541a6d293e71cc17ac25c",
  "assets/icons/sk_block.png": "101f2e02d24d406cbe83558e96ca8fde144999f7240704842d8b7aa1d5253734",
  "assets/icons/sk_counter.png": "3736f22938111c5044477f72d65c1200d3043d814316e3e8778c0e1ea0de55a3",
  "assets/icons/sk_darkelf_bash.png": "e08cd24df638f801b73cb52aabcd2c3eef9e34c0898c887d806ecb9604ad3e89",
  "assets/icons/sk_darkelf_block.png": "0cf74ef9934354b74405673972e22d196b190a6a6f44e64383a9587bc217841f",
  "assets/icons/sk_darkelf_counter.png": "382dd049783f65a7df688c2a3176bde5ae006697ce7ccf03bcd6ef450bb54281",
  "assets/icons/sk_darkelf_dash.png": "d516f69c26f82e03b8a0c735d96cdda66e690bdffcd95c34ebbaa0ffa58d5401",
  "assets/icons/sk_darkelf_guard.png": "9bef7321a4597f37b5ef360872d834eb2c7d221a1ba53dbea094d536f150e696",
  "assets/icons/sk_darkelf_heal.png": "d18c57972f8225b111b54f4a22e70a13ac2b43241d4571a34d914fca30e9a6c2",
  "assets/icons/sk_darkelf_quake.png": "a11301d404553a3eb26a874b1e3dfd2e7047634cc46f9f8c4dba86a7767d92f3",
  "assets/icons/sk_darkelf_stun.png": "326bdf6fcf376826fce431f1612fd58ed61fb1a115082aae278d0f0f624251fb",
  "assets/icons/sk_darkelf_ult.png": "255e8514c08775d3612f226cb8050317945b7fe3f57e09708902324afae69e2e",
  "assets/icons/sk_darkelf_whirl.png": "cf60c00c4a04c92b265a65cb666deb4c62e73384bebacb9d9ec0e6ab7f339d3e",
  "assets/icons/sk_dash.png": "99fb451797bc7f3eb5a9861531de093ace1451a18f5f28426e33f48a22fef800",
  "assets/icons/sk_elf_bash.png": "7ee5f7c99aadd4db94063c1f0e8a86bd4eacee0321d631334c422f80d861844f",
  "assets/icons/sk_elf_block.png": "a4477b4a53aba765990488b6759ceba3ef28b4243a423cf6016486f8b0989a06",
  "assets/icons/sk_elf_counter.png": "70478e3b5792c6a2b36f4622835ca8adbb94f028935fd737099583f02ce8e39a",
  "assets/icons/sk_elf_dash.png": "55f4d78198282ae94cebd670001442b68885a2aa74084f224d1cdf49a21afb05",
  "assets/icons/sk_elf_guard.png": "07146327614f1094956f6424b6ed42393aec94df1046252fb924828f8ac9cc5d",
  "assets/icons/sk_elf_heal.png": "ae5be2245e086598546c269cdf512b4caff54c4642e1fa78775b856fbfe0d0f4",
  "assets/icons/sk_elf_quake.png": "12a1b7fd4f0e9b981a7bac152fc39c6a9fc9877fe40df0aa0a9424f972dce33a",
  "assets/icons/sk_elf_stun.png": "1994d15f6ff22f29909c7935e5e3c428930db9c75727b459bd78752f7ed94cd2",
  "assets/icons/sk_elf_ult.png": "41389d175ebd0bf614ce1ff2c91bb05de5de1bc7e9e146ca07bb95f993b72edc",
  "assets/icons/sk_elf_whirl.png": "655db4e29f3cb5b67911ce83a494bc6fa0a57ecca0703833ef3c82a071e92beb",
  "assets/icons/sk_guard.png": "1ce707492e5f0887f601ec6ada3f34ffe3d5216743fd9674784e12f53f37dd2e",
  "assets/icons/sk_heal.png": "1319168ec6173fd94f5e2f0a7f26bc5c24842317bbb5b32ea344e5ba51561fb8",
  "assets/icons/sk_p_body.png": "96c7f54bea7dd84161f8df900aa56e28011ebea945cf94b71c277a64c5e0b6b8",
  "assets/icons/sk_p_crit.png": "59cc7a0dc71d522ebb3b0f52dd05437344bb4784edac60c59c03afadf5811032",
  "assets/icons/sk_p_d1.png": "93fae6f71551a5848ba58390b417c6bffd52fe9e22b8b099a65413f2d5020630",
  "assets/icons/sk_p_d2.png": "704db0b6f5abc17731e88c7fff77e391d81216125cf09a75c7613eb1c07feab1",
  "assets/icons/sk_p_d3.png": "ce9f8149875e20057f7021544bd7751927e5050603fbd4521e0ab9ab1e7bc50b",
  "assets/icons/sk_p_d4.png": "a8399e2f03314eec5cc2eeaf0960d120643f512ab7821f4a79cb93ca33a99654",
  "assets/icons/sk_p_d5.png": "c5e0a7ac27cf7eb0a706e0f09e0865f55d14bb09748823d9810dc5b5a304d1c6",
  "assets/icons/sk_p_e1.png": "6f0a6f04c96b74605c561ea001377f97adeb3bd6a1356fa0f4d36835adf9a434",
  "assets/icons/sk_p_e2.png": "e49a7df4edc9d1c0f6961c5d6c6e44259e87f7c74809987940adb7e06e71394e",
  "assets/icons/sk_p_e3.png": "7cc365ddf9f346ab1c464037ce2cfa1024201dca6c6a6eee3b0a0b8d606220c3",
  "assets/icons/sk_p_e4.png": "ac608db522551d5b6586eddd693c133e48485cdbd1cafcbe8833663ad9a880b4",
  "assets/icons/sk_p_e5.png": "1afb8975184b5026ee35ce534c23708c5350641e8bd463008699561dc496c770",
  "assets/icons/sk_p_focus.png": "52077f94478b9951616c6489930ef164244bab12848e65cd5c4c7698c742d0d5",
  "assets/icons/sk_p_skin.png": "b979c1ab310b103080243ff60b864c2bd04e49a04dd98f3b8374bc435d98d96f",
  "assets/icons/sk_p_w1.png": "bba3e42a2f660b699a7a75227641e4aee140661b8ec0b16923807e93a39e1e3e",
  "assets/icons/sk_p_w2.png": "fb47f663300aea939a1bfdb201c17d2738f258375332fdbddb433c05501b6445",
  "assets/icons/sk_p_w3.png": "07a566f2c7ae9fffc8f6b6fe282037028e9e219672664168958eeb5bf032eaeb",
  "assets/icons/sk_p_w4.png": "9ee6159528aeca7f4c087b83fb83d64c7790e1b2fb1bb3372fdcae4eac7aa651",
  "assets/icons/sk_p_w5.png": "27891e01bf0cb62ae8933cd088a3118c02b9fb09b56e5f68f4ad0ad9d63e0abf",
  "assets/icons/sk_p_will.png": "18a5ac4cd7c4bb2c5243021e37b37ad5968f335d7e583b71d30edb8eb35bd51f",
  "assets/icons/sk_quake.png": "790e8e6ce393aa648e940d2e1929df72be664825fef4ff2be2077ee746eedef7",
  "assets/icons/sk_stun.png": "5a2e6d1d71741d9a61ddd5b31c9024863ad2ae85f68152232e82b6bf48a7c5cb",
  "assets/icons/sk_ult.png": "5645d3f921753aeef8159e2e97ec8087ca3193a8145068a765f1f3245021eea0",
  "assets/icons/sk_whirl.png": "b4890a6d0e2a0b9c6e72c7a99ce8c533881203478e97ae633b6c2aa7f865ffff",
  "assets/icons/sk_wizard_bash.png": "ac57e30523abf3012efc04d21b8daf292da422b4f8dec2e3a12e10499a6b1d57",
  "assets/icons/sk_wizard_block.png": "e320be3f20e4c430d823768f91b8b28dccea508c054945fd51da61802da344ba",
  "assets/icons/sk_wizard_counter.png": "3f575f7db2646e54e90126167a312e16637d49de89b5a6a3740e5c7e9c6eec35",
  "assets/icons/sk_wizard_dash.png": "77c0c2e2195f2de3b3a6962a08eba423feceba815a5a2ca5823d2eb4c4bf9dc2",
  "assets/icons/sk_wizard_guard.png": "d1d4825023f1b53302e1242787f9c8a25eb32811d2ea30582a87b21b5109b798",
  "assets/icons/sk_wizard_heal.png": "1d1e8908db720750942f58af2940d5320a5a367ae9c613d3d3cb402fa3b579ec",
  "assets/icons/sk_wizard_quake.png": "8ae2dbc2b6c09f5384a49273fda1fb811a806134a39ec4464183b1b4b5b13f34",
  "assets/icons/sk_wizard_stun.png": "2381390b66fabef9c7203a278d4b9ec1539d56e21aef5964d6f4d54d235936c5",
  "assets/icons/sk_wizard_ult.png": "261e3492242f4b268ee7f07655db6882113c5bc44d1760ce7f25fb30d0b9661c",
  "assets/icons/sk_wizard_whirl.png": "3fda64a3949e02e16df73c044f1e12c807fe6ee490cc4f3c12284c5659ec11ed",
  "assets/icons/skullBlade.png": "57f6a050e13d07be422466bf08851daa2360d63c615b76642cc7b0071138b3c5",
  "assets/icons/spriteCloak.png": "302145a4c35afda000e43148ef26b7a89104fad8f569505ac0abd134e5a355eb",
  "assets/icons/steelAxe.png": "de7e35d80251966d59dde7d29fe92403c9341cea91918395aeeb6d56945cde17",
  "assets/icons/steelAxe_r.png": "1383cdf40eebcb32cfe2145ddf87484c8848a38d8b07f7f2459bb93645e02d01",
  "assets/icons/steelBow.png": "d2ba9298673fdbfe6e2c501cd70e5dabfb2211aa9aeed8df4572971e1bc21ea0",
  "assets/icons/steelBow_r.png": "0e101922d3405f6ccded595a9c8a3f2b6b67df710fda64b1e26515be377ae53e",
  "assets/icons/steelClaw.png": "06ff9486544b25875097439801cd5807ea12a8af772b3c4d192b5fa4c37aac21",
  "assets/icons/steelClaw_r.png": "b1eb58065e5dd6c5ab04d800b142c76ff5e4ce2c9bfd3d0f7e556654d4cc29a8",
  "assets/icons/steelDagger.png": "1d0fdbcfa933633871a503d2fa095d7b73237359e8b28c83684a5ebb6abe642c",
  "assets/icons/steelDagger_r.png": "ed144472aeba36bb849b55603f1b8ed4e86077cef93e915cd55a738c13a12eab",
  "assets/icons/steelDual.png": "c4e2f359f176c77d495c4cdf0f849ee938bc1301fdf05f47cb6939fd03886e02",
  "assets/icons/steelDual_r.png": "38d0f5abcb28b121716c5d66c35bb53da9f165ca63a9394c78be70af6cdf37b2",
  "assets/icons/steelGreatsword.png": "a7658a2ea3fb75abb93129e431f1c261a49897e13e9ec0b5d21177d48b0a7a84",
  "assets/icons/steelGreatsword_r.png": "64d213a4a2d31833b6556520357fcb307ff833beedc91d0041ff399d079cfce1",
  "assets/icons/steelSpear.png": "0261b772cd56070c7cdf56536ca8cd602c4be702a0c06b50592d93852cb76329",
  "assets/icons/steelSpear_r.png": "ce29e2a96409bb87a5d027b2a2bf26ddaa1ad20c83dc780b1307c43aada593c7",
  "assets/icons/steelStaff.png": "eb3f0c924ecd2a55c30ffa327f871a0630457840c9da889616fea9ea68ca78f6",
  "assets/icons/steelStaff_r.png": "7e9d71fc4f35518f08c05e3c97b75cf5a55903d5663c0b1b1a4fbb7e07e89a8a",
  "assets/icons/steelSword.png": "aae2d7353dd0132dc850a396da0082ab3ee260ac5167b7c9a945c2cfe84a2047",
  "assets/icons/steelSword_r.png": "c731120618a7130eeac6c8212ef098677e541652f98ea58d2aa09951f2cef7d7",
  "assets/icons/vineSpear.png": "486749b314d4aeaa7ca8824d31ac2826c429d898e5656707254af15e407b6790",
  "assets/icons/wardenBelt.png": "42ba69493ce9ede69f91322a34f1caa67656d54e77b70cf3c46f2d23379c5942",
  "assets/icons/weaponScroll.png": "ab6a226d68b8e8229a042f3cc7036f3600716fd8d68e477419c7040b089a4dc8",
  "assets/icons/weaponScrollB.png": "e1483b4c25a4ed99afe484e2751964a0e90fc077dd177825a472f441630f0c6b",
  "assets/icons/wispEar.png": "b7c120364ffdd07ab9867f264bed6593cb423d6399f4e143a31e8d1203144686",
  "assets/icons/woodBow.png": "8802fd5a454571bb006c6e53c242b109104cc3448438341f8cd4d74f914c6c8b",
  "assets/icons/woodClaw.png": "fe76668d7220858d0b92a9655c61c9d2364f9422dcd6936afb07972afa8f09d4",
  "assets/icons/woodStaff.png": "eaa9dff6eb8244757c8d9b6ec49e3ec49ef09f7dfbd6c9d25e6e673d40ad5687",
  "assets/icons/woodSword.png": "991222329ceef9630d0edd3964965c53444d3fbd09366acb92ffe4772ea92cae",
  "assets/icons/wraithArmor.png": "0e1d7d3e6cc354bda4408e8704f9367b72cba81bbdb8af232dc3b421bcd22ed0",
  "assets/icons/wraithBow.png": "c56f337fbac2811bbdec66bc8d93ab9988b980ba35a59bf866a363209f7c4f6a",
  "assets/icons/wraithClaw.png": "7e2ee120b9d61f86d48bd49101411ec4c6df96ee8bed9ed2d6ca7886bfe91e87",
  "assets/icons/wraithStaff.png": "95c131c8a129744656fd47c55ee3a319027de2956419c99d5755b8ef529815d2",
  "assets/icons/wraithSword.png": "12e36ba180843a6a060c6b0362d47c49ec6ad2a9c41301b20e2362fa122665d8",
  "assets/icons/wrist1.png": "4aa580f6bd7c125c8b116a14dd4877626972231fca3d7f51fb0cd87c32e387cd",
  "assets/icons/wrist2.png": "b0172d94e4fee354c55b8fffe427e7253253871f31123302d374712cd3769c6d",
  "assets/icons/wrist3.png": "67c7074c2bdb1c0657ef0c48edaf7ccd2fd24aeb3c5a616c091e9fa5fed51ab5",
  "assets/icons/wrist4.png": "7d0f89b2c8b8b97e24d571e0104294618994002853db17805c2de7367d17cc81",
  "assets/icons/wrist5.png": "7a7a2a7627e4863c5eab7e322b013c0631df78eb3282567e0eb892ee90669480",
  "assets/knight.png": "1212d624d20ef3142bd9caf0cf1881dac1e5c3c9f29c5ae9d8ca5989e294d129",
  "assets/m_blizzsnake.png": "64891125acbc3d50d365837869a95930a34c516d3981e3092ddd48bcb75121c4",
  "assets/m_boss.png": "07746547ed48df456cef86b0ca78de5c898418e636777cedde092128dd5a723b",
  "assets/m_crab.png": "cc4b33e3a87ee2ad1de96481fc5e442253597795ea96756fa6ab4a0a656d0cce",
  "assets/m_drake.png": "99941f8acc8b9aa0e1dcab6410b5b58928872b7453e94f70b488e7c1b64c2654",
  "assets/m_ember.png": "e6eec054d1da8834238aff258051410227a9047c0bd24136f85d8ef653da8c09",
  "assets/m_eye.png": "81a33671710ae9e311a976bb21cd206626af9c70587042df6d97ac5cd411a7e7",
  "assets/m_frostbeetle.png": "b617522c517016c4288b5e48bb86ea6067f25e2afd66e935c13e37822e52815c",
  "assets/m_frostjelly.png": "9e4460fcc806731dfca6e217caaf479754c70f246b50af97e770c0ebae491689",
  "assets/m_goblin.png": "eabbf11bb89aafcb91eb89cc85f2dce1ee608daf918be7f5832a9298cd2bf773",
  "assets/m_hopfrog.png": "0329b921f5e1bbff584433470a96749a34a4b52046a92758e82a9f3ca4aa7ece",
  "assets/m_icesprite.png": "0a6be377b0608394ef42a3098d1e72a0bd432dd5c3d05f1dc493261895ddb242",
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
  "assets/출처.txt": "a98814b7064d1c9728acbf7de1e80c03da8faf0b1c1bf635b8fd3a75ce59537b",
  "data/balance.js": "e0b21d68c715d1f4d2ed9eb8af30175bfee339187e0c9a410f4f9c8406056d9f",
  "data/estimate.js": "7300765c460d3479e5ec5b774a9e5253e7904955669030a7eac1671844f08bfa",
  "data/maps.js": "51b0a4aa8afe9f50b07ca3d3e7905033a93143c800d9895be8bc262c2bf1b457",
  "icons/icon-192.png": "c1e8a42f4760de72d5ba21a1d683111e137ab863893827b5c4e9ed2ceb86aaf2",
  "icons/icon-512.png": "f236786d645fb51e02640e919d146a79b8d47925599c924ccb86ef4ae34470c7",
  "icons/icon-maskable-512.png": "d209bbef68bf9c836b7675a99c297b45d7ec2d55a4b75736f042870ddd8e567d",
  "index.html": "42bc27545eea1b930c3d60ed688931493a0fa20adade1f208571b784c5d76fa7",
  "manifest.webmanifest": "e52e09ae050d75862cd4048e27a0480f2a2e128b32557c4debb4160aa3809f8e",
  "src/cbal.js": "5fafff794507f139f04c1daf2d8f29ccc39f956fdb3cb923574ce425831c3cc3",
  "src/domain/autohunt.js": "250bf3c18b42bb778322f712898a4174f2564a440fa0b621aa9ea1f9af708cc4",
  "src/domain/boss.js": "91dafb0d88f42a8995c02ae5051e652521bc732ccc0991a8dd009bdde616e599",
  "src/domain/buffs.js": "25f969d5bf60eb4c2af88bd31d4e0b935b5bccd8d1a799104af33dcc68df84c8",
  "src/domain/chars.js": "fdbafe94779a473a0b3b0070756e936f3613982a47174d3a13a8c62913eb0cad",
  "src/domain/classes.js": "362a7ddce9f235251b246c6bd575bdae4d0feaa9d5122518ae7d8a6a1c5d3297",
  "src/domain/collect.js": "6a47649f2678e3c23f0f3d0d25f756010262b57f242858b9a643893c106ee073",
  "src/domain/combat.js": "fcd8b93455fdf41dcc4bdc5d6f4b3490af0e660a85c10de83f4f4302fd7f6555",
  "src/domain/common.js": "3a003b4896900108a651821ac4d183146a235527956d9475a8bf69e4676779db",
  "src/domain/compare.js": "099c67c135500f1e685e0b186866f9d18160e80dc302267a347016b5cb7e1189",
  "src/domain/daynight.js": "950b528554625b56bb0a5fa59e7371c2ff4d64e7057b9fe00a8a003b2bb86c98",
  "src/domain/enchant.js": "8332d320d4c4c02d036823a55b2f57d6d26d0369fd8d5385a2708198726d7251",
  "src/domain/growth.js": "be6e932c501822d356564ce2bf619cf8b440ede41be14672bf4cd65dd889a747",
  "src/domain/hotbar.js": "8793696e53d1ee5e40dbc1ae46b7a85f7f9108755b8b4376787aa80d4979d446",
  "src/domain/inventory.js": "fb1346618bfe25fef5df5fefffbf640c69c48fed7dccd40ad9806cfbfc28d916",
  "src/domain/morph.js": "7d2231f7ed4cd003d5186a0a5c6c677c9ed9c209bb33434a2585c6c0b0466c66",
  "src/domain/path.js": "96e12b87b5e8843f0c38a03363cf4ab9ac8bc95fa3c166d668a65d0151ebc52f",
  "src/domain/progression.js": "744ce5e16968a932ffc2919eac05b274321ef4d4f5e64f3914aca466a5ae82c6",
  "src/domain/rewards.js": "d7aebad1216a05224fdd73a3b1c9f4852f365f0813b7a286a53d463603e399cb",
  "src/domain/rng.js": "bc81a7f7bebb527ce7ac3bd95485b408897f0378a5ab6effca64446e84f2ac88",
  "src/domain/save.js": "5e57a479a512e2ca577652dea3deca44b9889dcd22640a5b56bb80a0d3f93ea3",
  "src/domain/skills.js": "a1b25876fd0fcf607c2300e8486e42f7dfc9c116fb43b2fc34f9da2a41c54ca7",
  "src/main.js": "b4f6039cf10694fa59321a615f2b99456a204269993ec22ac0fd261da37c9d07",
  "src/scenes/World.js": "0115b3ea888208d26ab95cc1696140f765cefef0ed08f49864751c7a0dc2a2b8",
  "src/state.js": "9006be7df35f308381e9b109d9e547dbd06626b8d53e1abd9ccfa74c17163223",
  "src/ui/format.js": "3e21f5a6a31fc215b975bea062039e46d6577bc144574bb8f86ce3dd45c456f7",
  "src/ui/hud.css": "104f1a0ea866391e544ca4af49213db4a48db7e589f03b63450eaa2ec0001f2b",
  "src/ui/joystick.js": "2ae2f192bd005a5bb140c03a67ad5b401c2b3f7c474d6293a33ddccb8937158c",
  "src/ui/minimap.js": "fb1e196361c8afd9b76da6af053c5c3416237a5f71d537867a45c8c513270a45",
  "src/ui/prefs.js": "bb92e4b435b88bff8449aad908b60c82f8a10e5adb2c7375e040e9e2cc0160f7",
  "src/ui/skillfx.js": "61e18be85fa38b398c81a913d067a519db5d5cbd325c3639aa242f51cc7a3fd5",
  "src/ui/windows.js": "b4dea7edbbbef44722ebf1ff287835e3f1bcaea99ea47ba7a77edc8db4d72704",
  "src/ui/worldmap.js": "e29a3d789f20b6dfbd18651f8c9eb34e51fe1062db84b17322a2b0b763f7ac02",
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

// 이 빌드의 캐시에 파일이 모두 있는지
async function cacheReady() {
  if (!await caches.has(CACHE_NAME)) return false;
  const cache = await caches.open(CACHE_NAME);
  for (const name of Object.keys(FILES)) {
    if (!await cache.match(fileURL(name))) return false;
  }
  return true;
}

self.addEventListener("message", event => {
  const reply = data => {
    if (event.ports && event.ports[0]) event.ports[0].postMessage(data);
  };
  if (event.data === "status") {
    event.waitUntil((async () => {
      try {
        reply({ready: await cacheReady(), version: VERSION});
      } catch (_) {
        reply({ready: false, version: VERSION});
      }
    })());
  } else if (event.data === "apply" || (typeof event.data === "string" && event.data.startsWith("apply:"))) {
    // "apply:<버전>" = 게임 중 [지금 업데이트]. 알린 버전과 다르거나 파일이 다 없으면 바꾸지 않는다
    const expected = event.data === "apply" ? null : event.data.slice(6);
    event.waitUntil((async () => {
      try {
        if (expected !== null && expected !== VERSION) {
          reply({applied: false, reason: "version"});
          return;
        }
        if (!await cacheReady()) {
          reply({applied: false, reason: "not-ready"});
          return;
        }
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
