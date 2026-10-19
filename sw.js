"use strict";

const VERSION = "42cdffbfe977";
const FILES = {
  ".nojekyll": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "assets/coin.png": "ad1f568bc66eeac3b601d36350157f1ab1eb2d44f5e47e721c37870f10a1290f",
  "assets/fx_levelup.png": "d2435d5659d663b047a427599602b95a6ce0abf26bcbbf29f27469b532d867be",
  "assets/fx_return.png": "97f2918a318f7e0f051af4d6e7aafa37b29d01fb6dadbe1772fc8da2aee84d89",
  "assets/fx_slash.png": "faf5de591cd78a07b209ecfad4abda3a657663e7a5622a47f4f780e13e4d476f",
  "assets/fx_smoke.png": "206a9487b996a6d60a682e7a55923f27612f5331d53a587a19ad7b33e71a3814",
  "assets/hero.png": "c18d65e0b6b4cf9a60ccc2687234cfe6cfe8d361659bd9e559efe9c2d603c122",
  "assets/icons/armorScroll.png": "18b0b275c18584ae1badd43de89fc8d40b8dd48c1227ed3d3b82b5f9c17ec672",
  "assets/icons/armorScrollB.png": "0ec079934a2d5a26bcaa2a26791a17254a556815423b185ac4a739e307d35074",
  "assets/icons/belt1.png": "0af3258df38f4e2c0920c43894635dc6e58686641de75e5cc5fc6ef997477807",
  "assets/icons/belt1_r.png": "af8e019881d9ba1e6b5704e802b51e679e63c89ba0385e2b04d37a564e733881",
  "assets/icons/belt2.png": "ef751edc8694c96cf6945eb5dc1dbb00a85b1001035ef19ae2c30818e9f81fbd",
  "assets/icons/belt2_r.png": "1a7c9fdbcacf02f6292bf4a7eb0af2744fd6d6e52db3d36ecb20c75bdd51abec",
  "assets/icons/belt3.png": "738787034b097401ea7f6701a8af52a5c739ee9f4078fd2fc4f5f63a22b61be5",
  "assets/icons/belt3_r.png": "006c376e315eda558f9707afb50760aec6ca95d767d29480f40f88381b7381ef",
  "assets/icons/belt4.png": "6be50dc75bee22c1c32fc6ef497f7b07580ad8421fc52b3aff53ea55f8ebd7b7",
  "assets/icons/belt4_r.png": "83d8f24ed04422489f07e6bbe524ebec2e2950716c2a3ece2cee7f76a89ca9e3",
  "assets/icons/boots1.png": "a9f5072ed8f35fd29eacc98dda4c25a7d0807b7107ef006d5807aeb0ba5d2345",
  "assets/icons/boots1_r.png": "5569f6bde068092cc5a255f1686aec37f14dadfb54796c5df30abc3849f0a859",
  "assets/icons/boots2.png": "cbe91c5e0ba159c506f7049a622695e70237d8212035da5d33256d34e54a85bc",
  "assets/icons/boots2_r.png": "687e27076bb1ece96b6f0c797e70b0a363dbf2bb9cd6902c1ae59a3c1c032913",
  "assets/icons/boots3.png": "cb5629bddcfd205525530fb973bc664904d007a781b83fd5ef6963732f0092cd",
  "assets/icons/boots3_r.png": "dd7cb270f66488eca3a7c5fce378108d0734a0451982c21d84f255e58c6c1145",
  "assets/icons/boots4.png": "620e78dcfc7e6dc7fb89d2e0d38b180e0062a993356f0a28992a6e00c0e0ccf3",
  "assets/icons/boots4_r.png": "cf4faf2bf96d380988c99579806749bf529cdd89391588197f29fd5bf7f755bc",
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
  "assets/icons/clothArmor.png": "5ea88869a03e73877c10cdbba5424e7c62dc8448175ae99240d37517b050350b",
  "assets/icons/deepAxe.png": "174cf376444aab46a6c637f6acd7f2378c260cfb23fd57f9ee90b9214850aa49",
  "assets/icons/deepAxe_r.png": "185e732233f18df061ada1a25892a0f114c07e596c7799e75250feee1ae50407",
  "assets/icons/deepDagger.png": "3278912eb41a445bc567b4cfb97c58071a969eb7373c28664a130b9674590dc5",
  "assets/icons/deepDagger_r.png": "99aa3a26f63ab16599a6c11ba526416387ce6a94150dded198cbfe1f4e644557",
  "assets/icons/deepGreatsword.png": "bdb020a313956713eb8522b85abeadc9a278144c63fbc828cf308a81bb4ea0e8",
  "assets/icons/deepGreatsword_r.png": "dcc603db430b15268f956a9942e170d7679e86919bce5e2f800a355c841e0141",
  "assets/icons/deepSpear.png": "ab9407c6bc3d817187ffcac71a2ccd784dddbe3253541c96f237ea126e478fee",
  "assets/icons/deepSpear_r.png": "86ef79d3d2d02b2e3486896a680342133802ed8f498c96f2d6df75e411cd3433",
  "assets/icons/deepSword.png": "2382d8ad90d81001a4d30b7802251ffb04d5cff231b5214c4b85f5aee1dcce67",
  "assets/icons/deepSword_r.png": "c6270a588021c1f5639faf50cbd81aac7c0feb05d34ae9f4ef7e2d7eb36522fc",
  "assets/icons/dollBox.png": "241805cb23b5ff52cf945733113a7af206b078a83982559370cbf5babda3fc68",
  "assets/icons/downScroll.png": "204ded4606feb81ccda1b0ec7747193327e3ac07953a4a5b78e8b4b69a68c014",
  "assets/icons/elixirCon.png": "0fe8041d0a1cde6aa85089b9e37fcfd530ca432dde4189274056652d876fbb5a",
  "assets/icons/elixirDex.png": "eb10e927c88a412d399c759a9f42c13961a4708e6149cf3e06ab4f4a3ced1fce",
  "assets/icons/elixirStr.png": "833246d656459a4d335838ae9424535e47486036dadd20d01585a22ab9fa8bed",
  "assets/icons/expScroll.png": "141bcb95d014e2da410ab9a623005e204cd2c85c63ea5a54dad45b6459b349b7",
  "assets/icons/gloves1.png": "af73e16b53b72660154da3573d64c98746570a054d0621a86a6c8b6b56686929",
  "assets/icons/gloves1_r.png": "669a8e890294324a060e0b21dc0d7dfa7c519fe5f7aebc484823ed1d45bf3c0b",
  "assets/icons/gloves2.png": "ad3b130de6f432ac0b796fb53358d416c5a0c3507b1ae406266b0f8ccfe63308",
  "assets/icons/gloves2_r.png": "bd0033052b8ae9528db8ddadb3b75261283ab4bf508ae4b2bf35211c63e87928",
  "assets/icons/gloves3.png": "7d5a7331d917bd5ec67f4f652043f085c5bacd99b980e89bcc0965ee30729757",
  "assets/icons/gloves3_r.png": "53a75f4be1589799cb3e6f31542e4413575f24b3ab63853a2a3218f7d7fa13ee",
  "assets/icons/gloves4.png": "f45cf59e82f0757c17daf30ada524c2c7d59eff6cbc1d1ca2667c4187f234745",
  "assets/icons/gloves4_r.png": "9762a5e060ca084027f5a668301ad6a532892c4561a011b1706200a8aaedf362",
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
  "assets/icons/huntScroll.png": "7c6be2eefba0871dd7630e947e9ddaef0888cb63e1e42839eae502cfcda7c3ae",
  "assets/icons/ironAxe.png": "56e7fd3773fc8d09f8ffd8f351ebb9a4453d48c551d9e8d8578e4c41f6968171",
  "assets/icons/ironAxe_r.png": "0efea27a7236abb46ac2bcb673bc5d55769fbbd741c45998f3e95aed0be954f8",
  "assets/icons/ironDagger.png": "c2554d3af7fd373b78fec8712144a37d3a1f23f265d57429068ceb1ecca9685a",
  "assets/icons/ironDagger_r.png": "d0cb3214731ece31dd90dd90975c094bda81ac3ddc88800f09118bacd98dd50f",
  "assets/icons/ironGreatsword.png": "96508550dafc4076293b6722b8063f57aa70015c973d5393a1a54ca5277bde46",
  "assets/icons/ironGreatsword_r.png": "980f745e230e6c593d2390fd412a0f46018fd807183f38319153ee5ee07fc896",
  "assets/icons/ironSpear.png": "4ee36f2c396884151484e066a20c7faff7c0fd163c9de52c13139cd9d5fb512a",
  "assets/icons/ironSpear_r.png": "2cc2e14c33eed1c9160e7f475a1f707b8eb48f513f956445cabe2ce396eeb734",
  "assets/icons/ironSword.png": "22553319f5a9c3494fce8a6d1170c8b5bbcad175ecd0caa9f52e22d7a2c5067e",
  "assets/icons/ironSword_r.png": "ed1caaddf81c25dc4fc22db081398d80e9d4e8c122f7ac4d274ccab4902d8f7e",
  "assets/icons/leatherArmor.png": "9bcbf38df45c9a88120c025cfdcad4b9a1b71c8b1f4bc04000694f7348c735c7",
  "assets/icons/leatherArmor_r.png": "22be71e40e394c4528e9755eb6a3bd7f308ef39b9d6944f8c489611c0b7a4261",
  "assets/icons/map.png": "bd2ebea34e83eb3e03f15dc0524c9f4d5ddc60b25202944ea12ad4324321da1c",
  "assets/icons/mithrilArmor.png": "067a1f854739a76387d6a4571859a4df23191cc14d3767862db5e9e72874fbc1",
  "assets/icons/mithrilArmor_r.png": "c030689a735f0bacc676df0cf76835f41771b139c31839d78ee77d6d3ee352bf",
  "assets/icons/mithrilAxe.png": "71b582cf39041239af5eeafef748df88e44bce7ed44635e3224ea36b6eb0f9ac",
  "assets/icons/mithrilAxe_r.png": "a3ea7db8389214831465a7a3584f2df26f25be00bce677dc7a10cfcbea558206",
  "assets/icons/mithrilDagger.png": "26eababe89256322422106eb84ae061bd33ce66e82abcedff7c0a7245a81d296",
  "assets/icons/mithrilDagger_r.png": "cbc0020c8f348cf274b80f39dd62a501306bd3414a94721fb2b1dff2b6bd0b45",
  "assets/icons/mithrilGreatsword.png": "489f64c759774e2d0b2c9311707dd97fc243d90c13d460269a6eeea73946f373",
  "assets/icons/mithrilGreatsword_r.png": "f4300b6c4ad94affd180e75b642a07558c380ab11ec8bc4dd4938f3122e44f1f",
  "assets/icons/mithrilSpear.png": "a327aadb8215cd4ead9a3afc25e064a01afcf4c45cb0f1e3f092151aa9e357ba",
  "assets/icons/mithrilSpear_r.png": "55f7f047dbb174e37dc8cc4dcaeca9e27688d432cdc692baa873016a061fff0b",
  "assets/icons/mithrilSword.png": "b7daad8a28e66e456332c79d1dd33988b1ac47f82d87cafa8b29b741fe6ab022",
  "assets/icons/mithrilSword_r.png": "d859bc2439849b1c5ced049776b01bdb0e30baeeeec04741e9806ac938cf63bf",
  "assets/icons/morphScroll.png": "317d3f6dfdb81c3a9a66762ca5c74f6070d83e7f749749dc0501d35ec6d1b72b",
  "assets/icons/neck1.png": "5d1e5db19dfeaa9ca4f67b3cbb776296da79ef86acad31d665816dfa74fdcad9",
  "assets/icons/neck2.png": "c13a6d1b75ef756ffb5b775e973b5f1b867c5f66b26086279fc60ab1b591e773",
  "assets/icons/neck3.png": "bbd435eb6e85ddd504926ec89189fb2adc8416f6688e2a1242e5872477e672d2",
  "assets/icons/neck4.png": "37cc1706a18ad3f4bfaef3150150b786c4ecc062d74216df291134557dfe051e",
  "assets/icons/pants1.png": "0e3af422d576482c2f4354801a318efd61f08ccbb0f7f57acc2a1bd231d216bc",
  "assets/icons/pants1_r.png": "e6753ad62cb43e5813b6bb5e6b18ad012b8506bd5167dd0c82520650ed988994",
  "assets/icons/pants2.png": "e27b5a0cc196d1f9bf0a85d908b1bfe12fec8f892eb230f6118fcad17b453f30",
  "assets/icons/pants2_r.png": "2bfa598c27132a05aaf03b36d5d21ef6172cabac934030a9502aff4b6c74c69c",
  "assets/icons/pants3.png": "bca17ccc3f96d3f4691692b20acb5bdf126d9a6af6679eec19ecd3b938b76bc9",
  "assets/icons/pants3_r.png": "ada211408df26512896b1758c1ef3293b82fd95fba4992027858c51ee5e002e7",
  "assets/icons/pants4.png": "dca5960141a0b0f5c8d8528f33119e15611d46b66a4b12451adbc6885747fe46",
  "assets/icons/pants4_r.png": "4647bd85e7875981a390164b371bc1779d7411f1d09360db701b4eb808dfbb2c",
  "assets/icons/plateArmor.png": "81760da63cbc72297b1a0df0113e6e0911457eeb62a0a2d5c46d39ab7185ca66",
  "assets/icons/plateArmor_r.png": "1f300a8fafcde7756bfc764546bbdd12fd5922f1aac3ef72e34bb1b690e5bbda",
  "assets/icons/potion.png": "217d036eae8bc50dd8dda11f0637ed9e2b359f97fa6d3cdccc77625884232299",
  "assets/icons/potionHigh.png": "dadca29ac4707fcc3af6d401161c587926196e9ca4fa67b65b5ae057680b1e9b",
  "assets/icons/potionMid.png": "db639a6b1d23d14a9564ad56e68eb4a55444c14809220b48446991cf938d4219",
  "assets/icons/powerPotion.png": "e5bc1664540cb2daff44464bc8add027179d22c73f8bcb9a12a46bf8b93698fc",
  "assets/icons/rates.png": "c2a98df71f3aa27e05b89ebe4a4ddc15d11fdeb0b2f1a0f08fe4cf88c9acc1af",
  "assets/icons/returnScroll.png": "7b0ebc0bdcd2cc5b3f6937f67f8f1f6b665c6f17573a6565e74d1e393afcf246",
  "assets/icons/ring1.png": "42a4e2f872201dcb0fc596eacc16ac4e5661610798ea1c797d155da6d00539d8",
  "assets/icons/ring2.png": "315bc33b52c0132306f82ecd34d4dcfcd02ce2896955a81a4093e7a14c5c78c8",
  "assets/icons/ring3.png": "429eca30a4019de97cf3936dd38a7229aefacfc2ff771192cb60feb6df3a6abf",
  "assets/icons/ring4.png": "7fb54afc220bc217cfb21952ab72f6741a95dc210d325c9c80ddce341bb50611",
  "assets/icons/shirt1.png": "a9afd6d339588d6ca0f278f78976cf0b6040a1e88f1cbf8000ae5ecf96577023",
  "assets/icons/shirt1_r.png": "0d1a6dbaadf0b12c1f81a0fc87c9043317f67fb67936127a16fb2308bf868f5a",
  "assets/icons/shirt2.png": "0c2b43f95ddaf23aa6b13af8edde2a819d7c01c54ae8d2fff5e5366bae77defe",
  "assets/icons/shirt2_r.png": "12572fcd27227e94586de2bc46cb7270c3472d00f66c3429dcb746bffadc7507",
  "assets/icons/shirt3.png": "3e6ef114b23b8531659c282ed832e2cce01c1981e76e1ef7941215967cc3d93d",
  "assets/icons/shirt3_r.png": "992d8648f5043b65cc6abc22a3511b3c6f657e37d8659a3768efe34bf723e5f3",
  "assets/icons/shirt4.png": "ce42d4a293f75bfa808567912e141d382279f76f0ad60dc25597d57f35d4105f",
  "assets/icons/shirt4_r.png": "5bbb2c59d2d31297fb29f55693a41d9276f0240306b0647e25cd837bb35e57ac",
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
  "assets/icons/steelAxe.png": "de7e35d80251966d59dde7d29fe92403c9341cea91918395aeeb6d56945cde17",
  "assets/icons/steelAxe_r.png": "1383cdf40eebcb32cfe2145ddf87484c8848a38d8b07f7f2459bb93645e02d01",
  "assets/icons/steelDagger.png": "1d0fdbcfa933633871a503d2fa095d7b73237359e8b28c83684a5ebb6abe642c",
  "assets/icons/steelDagger_r.png": "ed144472aeba36bb849b55603f1b8ed4e86077cef93e915cd55a738c13a12eab",
  "assets/icons/steelGreatsword.png": "a7658a2ea3fb75abb93129e431f1c261a49897e13e9ec0b5d21177d48b0a7a84",
  "assets/icons/steelGreatsword_r.png": "64d213a4a2d31833b6556520357fcb307ff833beedc91d0041ff399d079cfce1",
  "assets/icons/steelSpear.png": "0261b772cd56070c7cdf56536ca8cd602c4be702a0c06b50592d93852cb76329",
  "assets/icons/steelSpear_r.png": "ce29e2a96409bb87a5d027b2a2bf26ddaa1ad20c83dc780b1307c43aada593c7",
  "assets/icons/steelSword.png": "aae2d7353dd0132dc850a396da0082ab3ee260ac5167b7c9a945c2cfe84a2047",
  "assets/icons/steelSword_r.png": "c731120618a7130eeac6c8212ef098677e541652f98ea58d2aa09951f2cef7d7",
  "assets/icons/weaponScroll.png": "ab6a226d68b8e8229a042f3cc7036f3600716fd8d68e477419c7040b089a4dc8",
  "assets/icons/weaponScrollB.png": "e1483b4c25a4ed99afe484e2751964a0e90fc077dd177825a472f441630f0c6b",
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
  "assets/출처.txt": "a98814b7064d1c9728acbf7de1e80c03da8faf0b1c1bf635b8fd3a75ce59537b",
  "data/balance.js": "3c3fb75dfa67942adaa5c3055c59f18eabb1ad8d51f5d7593a9f0d2b7105684c",
  "data/estimate.js": "c967174046222d57afd5c6d83f3a271f81455340f55577438df6699467b240c6",
  "data/maps.js": "cc115eae67162b5bc2677b8f77338901ab0345679d5cd9e6a6a3f41aff9f1e5d",
  "icons/icon-192.png": "c1e8a42f4760de72d5ba21a1d683111e137ab863893827b5c4e9ed2ceb86aaf2",
  "icons/icon-512.png": "f236786d645fb51e02640e919d146a79b8d47925599c924ccb86ef4ae34470c7",
  "icons/icon-maskable-512.png": "d209bbef68bf9c836b7675a99c297b45d7ec2d55a4b75736f042870ddd8e567d",
  "index.html": "4fa0450a9e9602e7758556b89b60211137c7ac034be67f4bbcb0de02b2508ed0",
  "manifest.webmanifest": "e52e09ae050d75862cd4048e27a0480f2a2e128b32557c4debb4160aa3809f8e",
  "src/domain/autohunt.js": "250bf3c18b42bb778322f712898a4174f2564a440fa0b621aa9ea1f9af708cc4",
  "src/domain/boss.js": "91dafb0d88f42a8995c02ae5051e652521bc732ccc0991a8dd009bdde616e599",
  "src/domain/buffs.js": "25f969d5bf60eb4c2af88bd31d4e0b935b5bccd8d1a799104af33dcc68df84c8",
  "src/domain/collect.js": "90a2f692654f5fb75cb7c3b95ab06c5c002bfea0399799e85b9c447ee122354e",
  "src/domain/combat.js": "487c84069c110834aeeb3dbda1e1cb228ea4a04945007122cf769b77d8243bd4",
  "src/domain/common.js": "d85a68f7d6d2ed787534b91f5768579bde023a02139f7276c4201fd761da017b",
  "src/domain/compare.js": "b73e5b89c932fc0acfa4de5853ec45424012024268f3d4fe99240aa4c9c39725",
  "src/domain/daynight.js": "b8995277bde762690138db67d1d65add6eb8b2a5838a9d82877385973eef19cb",
  "src/domain/enchant.js": "0154d46a8c86eef3a7dc13a2445c0283e19038ddeb822b914e55fd6aa720296c",
  "src/domain/growth.js": "be6e932c501822d356564ce2bf619cf8b440ede41be14672bf4cd65dd889a747",
  "src/domain/hotbar.js": "8793696e53d1ee5e40dbc1ae46b7a85f7f9108755b8b4376787aa80d4979d446",
  "src/domain/inventory.js": "e88bd867c8e89a245fa1e5cfe1bcf17d8acb508af6ca0c0f964739a82a8a693a",
  "src/domain/morph.js": "3de182c71bed4f6cdb2943f5741303fa18ca24a5ac5ad174cda4404ae7e6e3d1",
  "src/domain/path.js": "96e12b87b5e8843f0c38a03363cf4ab9ac8bc95fa3c166d668a65d0151ebc52f",
  "src/domain/progression.js": "81efac045be86425fc2c7aae8a3cc3874cd57f588df8b52f6dbab138333beee3",
  "src/domain/rewards.js": "d7aebad1216a05224fdd73a3b1c9f4852f365f0813b7a286a53d463603e399cb",
  "src/domain/rng.js": "bc81a7f7bebb527ce7ac3bd95485b408897f0378a5ab6effca64446e84f2ac88",
  "src/domain/save.js": "0d050d10d7768f01db7548c8f2467fb147fbedfc7eeb1f5188d95cb3e2b2d486",
  "src/domain/skills.js": "b132093eeeb44ade6b6a337a2e4fa145af89f1d8152a731b8b8aed42d7f547e5",
  "src/main.js": "78a0a4940ad04faadc5269bc400f83cd85deb166a492cc200aedd1de8900895e",
  "src/scenes/World.js": "8ed374ece016f9c7ec422fc473e63138d50ca98aa53a30024d3fd963c9047e50",
  "src/state.js": "1059e9b680cc6a55a7d2518f9bfaf68cadada98f0c8ebda3df858ae5eaa87452",
  "src/ui/format.js": "c5a1f8533e5c1a85c4b305955c5bdc6b2b7ce6e24a63569a33600e7dbe14827d",
  "src/ui/hud.css": "8476c72cd1712b205f7ba6e71d7b1c3c0bfe03a60f9a0151595703198d508b74",
  "src/ui/joystick.js": "2ae2f192bd005a5bb140c03a67ad5b401c2b3f7c474d6293a33ddccb8937158c",
  "src/ui/minimap.js": "d9da5373661ac42925847fd7a625cb369f1aaa51048678ef0d2644b93a293caa",
  "src/ui/prefs.js": "0a2ef4fa23761d8782d2ac9f8e6bbf50c1336d9fdcb271106be71b7216d91a86",
  "src/ui/skillfx.js": "61e18be85fa38b398c81a913d067a519db5d5cbd325c3639aa242f51cc7a3fd5",
  "src/ui/windows.js": "9a0b516e21935a3aed5ae37764a13678b14fec26f23c8dc8ae2f3507be84f30f",
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
