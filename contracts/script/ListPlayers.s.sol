// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PlayerMarket} from "../src/PlayerMarket.sol";

/// @title ListPlayers
/// @notice Batch-lists the 200 star players from players.config.js onto the PlayerMarket.
///         Reads the deployed PlayerMarket address from env. Splits into batches of 50
///         to stay within block gas limits on X Layer Testnet.
contract ListPlayers is Script {
    // ── Struct for inline player data ─────────────────────────────
    struct PlayerEntry {
        uint256 id;
        string name;
        string code;
    }

    function run() external {
        uint256 deployerKey = vm.envUint("OPERATOR_PRIVATE_KEY");
        address marketAddr = vm.envAddress("PLAYER_MARKET");

        PlayerMarket market = PlayerMarket(marketAddr);
        console2.log("PlayerMarket:", marketAddr);
        console2.log("Listed before:", market.listedCount());

        // Build player arrays — all 200 players from players.config.js
        // Split into 4 batches of 50 for gas safety
        vm.startBroadcast(deployerKey);

        _listBatch1(market);
        _listBatch2(market);
        _listBatch3(market);
        _listBatch4(market);

        vm.stopBroadcast();

        console2.log("Listed after:", market.listedCount());
    }

    // ── Batch 1: Players 1–50 ─────────────────────────────────────
    function _listBatch1(PlayerMarket market) internal {
        uint256[] memory ids = new uint256[](50);
        string[] memory names = new string[](50);
        string[] memory symbols = new string[](50);

        // Argentina (1-5)
        _set(ids, names, symbols, 0,  1,  "KickStock Messi",       "KMESSI");
        _set(ids, names, symbols, 1,  2,  "KickStock J.Alvarez",   "KJALVAREZ");
        _set(ids, names, symbols, 2,  3,  "KickStock Enzo",        "KENZO");
        _set(ids, names, symbols, 3,  4,  "KickStock E.Martinez",  "KEMARTINEZ");
        _set(ids, names, symbols, 4,  5,  "KickStock L.Martinez",  "KLMARTINEZ");
        // Brazil (6-10)
        _set(ids, names, symbols, 5,  6,  "KickStock Vinicius",    "KVINICIUS");
        _set(ids, names, symbols, 6,  7,  "KickStock Rodrygo",     "KRODRYGO");
        _set(ids, names, symbols, 7,  8,  "KickStock Endrick",     "KENDRICK");
        _set(ids, names, symbols, 8,  9,  "KickStock B.Guimaraes", "KBGUIMA");
        _set(ids, names, symbols, 9,  10, "KickStock Alisson",     "KALISSON");
        // France (11-15)
        _set(ids, names, symbols, 10, 11, "KickStock Mbappe",      "KMBAPPE");
        _set(ids, names, symbols, 11, 12, "KickStock Griezmann",   "KGRIEZMANN");
        _set(ids, names, symbols, 12, 13, "KickStock Tchouameni",  "KTCHOUAMENI");
        _set(ids, names, symbols, 13, 14, "KickStock Saliba",      "KSALIBA");
        _set(ids, names, symbols, 14, 15, "KickStock Maignan",     "KMAIGNAN");
        // England (16-20)
        _set(ids, names, symbols, 15, 16, "KickStock Bellingham",  "KBELLINGHAM");
        _set(ids, names, symbols, 16, 17, "KickStock Kane",        "KKANE");
        _set(ids, names, symbols, 17, 18, "KickStock Saka",        "KSAKA");
        _set(ids, names, symbols, 18, 19, "KickStock Foden",       "KFODEN");
        _set(ids, names, symbols, 19, 20, "KickStock Rice",        "KRICE");
        // Spain (21-25)
        _set(ids, names, symbols, 20, 21, "KickStock Yamal",       "KYAMAL");
        _set(ids, names, symbols, 21, 22, "KickStock Pedri",       "KPEDRI");
        _set(ids, names, symbols, 22, 23, "KickStock Rodri",       "KRODRI");
        _set(ids, names, symbols, 23, 24, "KickStock Carvajal",    "KCARVAJAL");
        _set(ids, names, symbols, 24, 25, "KickStock Gavi",        "KGAVI");
        // Germany (26-29)
        _set(ids, names, symbols, 25, 26, "KickStock Wirtz",       "KWIRTZ");
        _set(ids, names, symbols, 26, 27, "KickStock Musiala",     "KMUSIALA");
        _set(ids, names, symbols, 27, 28, "KickStock Havertz",     "KHAVERTZ");
        _set(ids, names, symbols, 28, 29, "KickStock Rudiger",     "KRUDIGER");
        // Netherlands (30-33)
        _set(ids, names, symbols, 29, 30, "KickStock van Dijk",    "KVANDIJK");
        _set(ids, names, symbols, 30, 31, "KickStock Gakpo",       "KGAKPO");
        _set(ids, names, symbols, 31, 32, "KickStock F.de Jong",   "KFDEJONG");
        _set(ids, names, symbols, 32, 33, "KickStock X.Simons",    "KXSIMONS");
        // Portugal (34-37)
        _set(ids, names, symbols, 33, 34, "KickStock Ronaldo",     "KRONALDO");
        _set(ids, names, symbols, 34, 35, "KickStock B.Fernandes", "KBFERNANDES");
        _set(ids, names, symbols, 35, 36, "KickStock B.Silva",     "KBSILVA");
        _set(ids, names, symbols, 36, 37, "KickStock Leao",        "KLEAO");
        // Belgium (38-40)
        _set(ids, names, symbols, 37, 38, "KickStock De Bruyne",   "KDEBRUYNE");
        _set(ids, names, symbols, 38, 39, "KickStock Lukaku",      "KLUKAKU");
        _set(ids, names, symbols, 39, 40, "KickStock Courtois",    "KCOURTOIS");
        // Croatia (41-43)
        _set(ids, names, symbols, 40, 41, "KickStock Modric",      "KMODRIC");
        _set(ids, names, symbols, 41, 42, "KickStock Kovacic",     "KKOVACIC");
        _set(ids, names, symbols, 42, 43, "KickStock Gvardiol",    "KGVARDIOL");
        // Italy (44-47)
        _set(ids, names, symbols, 43, 44, "KickStock Donnarumma",  "KDONNARUMMA");
        _set(ids, names, symbols, 44, 45, "KickStock Barella",     "KBARELLA");
        _set(ids, names, symbols, 45, 46, "KickStock Chiesa",      "KCHIESA");
        _set(ids, names, symbols, 46, 47, "KickStock Bastoni",     "KBASTONI");
        // Uruguay (48-50)
        _set(ids, names, symbols, 47, 48, "KickStock Valverde",    "KVALVERDE");
        _set(ids, names, symbols, 48, 49, "KickStock Nunez",       "KNUNEZ");
        _set(ids, names, symbols, 49, 50, "KickStock Araujo",      "KARAUJO");

        market.listPlayersBatch(ids, names, symbols);
        console2.log("Batch 1 listed: 50 players (1-50)");
    }

    // ── Batch 2: Players 51–100 ───────────────────────────────────
    function _listBatch2(PlayerMarket market) internal {
        uint256[] memory ids = new uint256[](50);
        string[] memory names = new string[](50);
        string[] memory symbols = new string[](50);

        // Colombia (51-53)
        _set(ids, names, symbols, 0,  51, "KickStock L.Diaz",      "KLDIAZ");
        _set(ids, names, symbols, 1,  52, "KickStock James",       "KJAMES");
        _set(ids, names, symbols, 2,  53, "KickStock Arias",       "KJHARIAS");
        // Japan (54-56)
        _set(ids, names, symbols, 3,  54, "KickStock Kubo",        "KKUBO");
        _set(ids, names, symbols, 4,  55, "KickStock Mitoma",      "KMITOMA");
        _set(ids, names, symbols, 5,  56, "KickStock Endo",        "KENDO");
        // South Korea (57-59)
        _set(ids, names, symbols, 6,  57, "KickStock Son",         "KSON");
        _set(ids, names, symbols, 7,  58, "KickStock Kim Min-jae", "KKIMMINJAE");
        _set(ids, names, symbols, 8,  59, "KickStock Lee Kang-in", "KLEEKANGIN");
        // USA (60-63)
        _set(ids, names, symbols, 9,  60, "KickStock Pulisic",     "KPULISIC");
        _set(ids, names, symbols, 10, 61, "KickStock McKennie",    "KMCKENNIE");
        _set(ids, names, symbols, 11, 62, "KickStock T.Adams",     "KTADAMS");
        _set(ids, names, symbols, 12, 63, "KickStock Reyna",       "KREYNA");
        // Mexico (64-66)
        _set(ids, names, symbols, 13, 64, "KickStock Lozano",      "KLOZANO");
        _set(ids, names, symbols, 14, 65, "KickStock E.Alvarez",   "KEALVAREZ");
        _set(ids, names, symbols, 15, 66, "KickStock S.Gimenez",   "KSGIMENEZ");
        // Canada (67-69)
        _set(ids, names, symbols, 16, 67, "KickStock Davies",      "KDAVIES");
        _set(ids, names, symbols, 17, 68, "KickStock J.David",     "KJDAVID");
        _set(ids, names, symbols, 18, 69, "KickStock Buchanan",    "KBUCHANAN");
        // Morocco (70-73)
        _set(ids, names, symbols, 19, 70, "KickStock Hakimi",      "KHAKIMI");
        _set(ids, names, symbols, 20, 71, "KickStock Ziyech",      "KZIYECH");
        _set(ids, names, symbols, 21, 72, "KickStock En-Nesyri",   "KENNESYRI");
        _set(ids, names, symbols, 22, 73, "KickStock B.Diaz",      "KBDIAZ");
        // Senegal (74-76)
        _set(ids, names, symbols, 23, 74, "KickStock Mane",        "KMANE");
        _set(ids, names, symbols, 24, 75, "KickStock Koulibaly",   "KKOULIBALY");
        _set(ids, names, symbols, 25, 76, "KickStock I.Sarr",      "KISARR");
        // Nigeria (77-79)
        _set(ids, names, symbols, 26, 77, "KickStock Osimhen",     "KOSIMHEN");
        _set(ids, names, symbols, 27, 78, "KickStock Chukwueze",   "KCHUKWUEZE");
        _set(ids, names, symbols, 28, 79, "KickStock Ndidi",       "KNDIDI");
        // Egypt (80-82)
        _set(ids, names, symbols, 29, 80, "KickStock Salah",       "KSALAH");
        _set(ids, names, symbols, 30, 81, "KickStock Marmoush",    "KMARMOUSH");
        _set(ids, names, symbols, 31, 82, "KickStock Elneny",      "KELNENY");
        // Cameroon (83-84)
        _set(ids, names, symbols, 32, 83, "KickStock Anguissa",    "KANGUISSA");
        _set(ids, names, symbols, 33, 84, "KickStock Choupo",      "KCHOUPO");
        // Ivory Coast (85-87)
        _set(ids, names, symbols, 34, 85, "KickStock Haller",      "KHALLER");
        _set(ids, names, symbols, 35, 86, "KickStock Kessie",      "KKESSIE");
        _set(ids, names, symbols, 36, 87, "KickStock Adingra",     "KADINGRA");
        // Algeria (88-90)
        _set(ids, names, symbols, 37, 88, "KickStock Mahrez",      "KMAHREZ");
        _set(ids, names, symbols, 38, 89, "KickStock Bennacer",    "KBENNACER");
        _set(ids, names, symbols, 39, 90, "KickStock Gouiri",      "KGOUIRI");
        // Ghana (91-93)
        _set(ids, names, symbols, 40, 91, "KickStock Kudus",       "KKUDUS");
        _set(ids, names, symbols, 41, 92, "KickStock Partey",      "KPARTEY");
        _set(ids, names, symbols, 42, 93, "KickStock I.Williams",  "KIWILLIAMS");
        // Tunisia (94-95)
        _set(ids, names, symbols, 43, 94, "KickStock Msakni",      "KMSAKNI");
        _set(ids, names, symbols, 44, 95, "KickStock Skhiri",      "KSKHIRI");
        // Saudi Arabia (96-97)
        _set(ids, names, symbols, 45, 96, "KickStock Al-Dawsari",  "KALDAWSARI");
        _set(ids, names, symbols, 46, 97, "KickStock Al-Owais",    "KALOWAIS");
        // Iran (98-100)
        _set(ids, names, symbols, 47, 98, "KickStock Taremi",      "KTAREMI");
        _set(ids, names, symbols, 48, 99, "KickStock Azmoun",      "KAZMOUN");
        _set(ids, names, symbols, 49, 100,"KickStock Jahanbakhsh", "KJAHANB");

        market.listPlayersBatch(ids, names, symbols);
        console2.log("Batch 2 listed: 50 players (51-100)");
    }

    // ── Batch 3: Players 101–150 ──────────────────────────────────
    function _listBatch3(PlayerMarket market) internal {
        uint256[] memory ids = new uint256[](50);
        string[] memory names = new string[](50);
        string[] memory symbols = new string[](50);

        // Australia (101-103)
        _set(ids, names, symbols, 0,  101, "KickStock M.Ryan",     "KMRYAN");
        _set(ids, names, symbols, 1,  102, "KickStock Irvine",     "KIRVINE");
        _set(ids, names, symbols, 2,  103, "KickStock Goodwin",    "KGOODWIN");
        // Qatar (104-105)
        _set(ids, names, symbols, 3,  104, "KickStock Afif",       "KAFIF");
        _set(ids, names, symbols, 4,  105, "KickStock Almoez",     "KALMOEZ");
        // Iraq (106-107)
        _set(ids, names, symbols, 5,  106, "KickStock Mohanad",    "KMOHANAD");
        _set(ids, names, symbols, 6,  107, "KickStock A.Hussein",  "KAHUSSEIN");
        // Uzbekistan (108-109)
        _set(ids, names, symbols, 7,  108, "KickStock Shomurodov", "KSHOMURODOV");
        _set(ids, names, symbols, 8,  109, "KickStock Fayzullaev", "KFAYZULL");
        // Switzerland (110-112)
        _set(ids, names, symbols, 9,  110, "KickStock Xhaka",      "KXHAKA");
        _set(ids, names, symbols, 10, 111, "KickStock Akanji",     "KAKANJI");
        _set(ids, names, symbols, 11, 112, "KickStock Embolo",     "KEMBOLO");
        // Denmark (113-115)
        _set(ids, names, symbols, 12, 113, "KickStock Eriksen",    "KERIKSEN");
        _set(ids, names, symbols, 13, 114, "KickStock Hojlund",    "KHOJLUND");
        _set(ids, names, symbols, 14, 115, "KickStock Hojbjerg",   "KHOJBJERG");
        // Poland (116-118)
        _set(ids, names, symbols, 15, 116, "KickStock Lewandowski","KLEWANDWSK");
        _set(ids, names, symbols, 16, 117, "KickStock Zielinski",  "KZIELINSKI");
        _set(ids, names, symbols, 17, 118, "KickStock Szczesny",   "KSZCZESNY");
        // Austria (119-121)
        _set(ids, names, symbols, 18, 119, "KickStock Alaba",      "KALABA");
        _set(ids, names, symbols, 19, 120, "KickStock Sabitzer",   "KSABITZER");
        _set(ids, names, symbols, 20, 121, "KickStock Laimer",     "KLAIMER");
        // Turkey (122-124)
        _set(ids, names, symbols, 21, 122, "KickStock Calhanoglu", "KCALHANOGL");
        _set(ids, names, symbols, 22, 123, "KickStock A.Guler",    "KAGULER");
        _set(ids, names, symbols, 23, 124, "KickStock Yildiz",     "KYILDIZ");
        // Serbia (125-127)
        _set(ids, names, symbols, 24, 125, "KickStock Vlahovic",   "KVLAHOVIC");
        _set(ids, names, symbols, 25, 126, "KickStock Mitrovic",   "KMITROVIC");
        _set(ids, names, symbols, 26, 127, "KickStock SMS",        "KSMS");
        // Ukraine (128-130)
        _set(ids, names, symbols, 27, 128, "KickStock Mudryk",     "KMUDRYK");
        _set(ids, names, symbols, 28, 129, "KickStock Zinchenko",  "KZINCHENKO");
        _set(ids, names, symbols, 29, 130, "KickStock Lunin",      "KLUNIN");
        // Ecuador (131-133)
        _set(ids, names, symbols, 30, 131, "KickStock Caicedo",    "KCAICEDO");
        _set(ids, names, symbols, 31, 132, "KickStock E.Valencia", "KEVALENCIA");
        _set(ids, names, symbols, 32, 133, "KickStock Hincapie",   "KHINCAPIE");
        // Paraguay (134-135)
        _set(ids, names, symbols, 33, 134, "KickStock Almiron",    "KALMIRON");
        _set(ids, names, symbols, 34, 135, "KickStock Enciso",     "KENCISO");
        // Panama (136-137)
        _set(ids, names, symbols, 35, 136, "KickStock Fajardo",    "KFAJARDO");
        _set(ids, names, symbols, 36, 137, "KickStock Carrasquilla","KCARRASQ");
        // Costa Rica (138-139)
        _set(ids, names, symbols, 37, 138, "KickStock Navas",      "KNAVAS");
        _set(ids, names, symbols, 38, 139, "KickStock Campbell",   "KCAMPBELL");
        // Jamaica (140-141)
        _set(ids, names, symbols, 39, 140, "KickStock Bailey",     "KBAILEY");
        _set(ids, names, symbols, 40, 141, "KickStock Antonio",    "KANTONIO");
        // Norway (142-144)
        _set(ids, names, symbols, 41, 142, "KickStock Haaland",    "KHAALAND");
        _set(ids, names, symbols, 42, 143, "KickStock Odegaard",   "KODEGAARD");
        _set(ids, names, symbols, 43, 144, "KickStock Berge",      "KBERGE");
        // Sweden (145-147)
        _set(ids, names, symbols, 44, 145, "KickStock Isak",       "KISAK");
        _set(ids, names, symbols, 45, 146, "KickStock Kulusevski", "KKULUSEVSK");
        _set(ids, names, symbols, 46, 147, "KickStock Gyokeres",   "KGYOKERES");
        // Scotland (148-150)
        _set(ids, names, symbols, 47, 148, "KickStock Robertson",  "KROBERTSON");
        _set(ids, names, symbols, 48, 149, "KickStock McTominay",  "KMCTOMINAY");
        _set(ids, names, symbols, 49, 150, "KickStock McGinn",     "KMCGINN");

        market.listPlayersBatch(ids, names, symbols);
        console2.log("Batch 3 listed: 50 players (101-150)");
    }

    // ── Batch 4: Players 151–200 ──────────────────────────────────
    function _listBatch4(PlayerMarket market) internal {
        uint256[] memory ids = new uint256[](50);
        string[] memory names = new string[](50);
        string[] memory symbols = new string[](50);

        _set(ids, names, symbols, 0,  151, "KickStock Lautaro",    "KLAUTARO");
        _set(ids, names, symbols, 1,  152, "KickStock N.Molina",   "KNMOLINA");
        _set(ids, names, symbols, 2,  153, "KickStock Raphinha",   "KRAPHINHA");
        _set(ids, names, symbols, 3,  154, "KickStock Marquinhos", "KMARQUINHOS");
        _set(ids, names, symbols, 4,  155, "KickStock Dembele",    "KDEMBELE");
        _set(ids, names, symbols, 5,  156, "KickStock Camavinga",  "KCAMAVINGA");
        _set(ids, names, symbols, 6,  157, "KickStock Kolo Muani", "KKOLOMUANI");
        _set(ids, names, symbols, 7,  158, "KickStock Palmer",     "KPALMER");
        _set(ids, names, symbols, 8,  159, "KickStock Mainoo",     "KMAINOO");
        _set(ids, names, symbols, 9,  160, "KickStock N.Williams", "KNWILLIAMS");
        _set(ids, names, symbols, 10, 161, "KickStock D.Olmo",     "KDOLMO");
        _set(ids, names, symbols, 11, 162, "KickStock Sane",       "KSANE");
        _set(ids, names, symbols, 12, 163, "KickStock Kimmich",    "KKIMMICH");
        _set(ids, names, symbols, 13, 164, "KickStock Depay",      "KDEPAY");
        _set(ids, names, symbols, 14, 165, "KickStock R.Dias",     "KRDIAS");
        _set(ids, names, symbols, 15, 166, "KickStock D.Jota",     "KDJOTA");
        _set(ids, names, symbols, 16, 167, "KickStock Scamacca",   "KSCAMACCA");
        _set(ids, names, symbols, 17, 168, "KickStock Tonali",     "KTONALI");
        _set(ids, names, symbols, 18, 169, "KickStock Suarez",     "KSUAREZ");
        _set(ids, names, symbols, 19, 170, "KickStock R.Rios",     "KRRIOS");
        _set(ids, names, symbols, 20, 171, "KickStock Kamada",     "KKAMADA");
        _set(ids, names, symbols, 21, 172, "KickStock Doan",       "KDOAN");
        _set(ids, names, symbols, 22, 173, "KickStock Balogun",    "KBALOGUN");
        _set(ids, names, symbols, 23, 174, "KickStock Dest",       "KDEST");
        _set(ids, names, symbols, 24, 175, "KickStock A.Vega",     "KAVEGA");
        _set(ids, names, symbols, 25, 176, "KickStock Ounahi",     "KOUNAHI");
        _set(ids, names, symbols, 26, 177, "KickStock Mazraoui",   "KMAZRAOUI");
        _set(ids, names, symbols, 27, 178, "KickStock N.Jackson",  "KNJACKSON");
        _set(ids, names, symbols, 28, 179, "KickStock Lookman",    "KLOOKMAN");
        _set(ids, names, symbols, 29, 180, "KickStock Iwobi",      "KIWOBI");
        _set(ids, names, symbols, 30, 181, "KickStock M.Mohamed",  "KMMOHAMED");
        _set(ids, names, symbols, 31, 182, "KickStock Sangare",    "KSANGARE");
        _set(ids, names, symbols, 32, 183, "KickStock Hwang",      "KHWANG");
        _set(ids, names, symbols, 33, 184, "KickStock Kanno",      "KKANNO");
        _set(ids, names, symbols, 34, 185, "KickStock Duke",       "KDUKE");
        _set(ids, names, symbols, 35, 186, "KickStock R.Vargas",   "KRVARGAS");
        _set(ids, names, symbols, 36, 187, "KickStock Wind",       "KWIND");
        _set(ids, names, symbols, 37, 188, "KickStock Yazici",     "KYAZICI");
        _set(ids, names, symbols, 38, 189, "KickStock Kramaric",   "KKRAMARIC");
        _set(ids, names, symbols, 39, 190, "KickStock Doku",       "KDOKU");
        _set(ids, names, symbols, 40, 191, "KickStock Onana",      "KONANA");
        _set(ids, names, symbols, 41, 192, "KickStock Zalewski",   "KZALEWSKI");
        _set(ids, names, symbols, 42, 193, "KickStock Baumgartner","KBAUMGART");
        _set(ids, names, symbols, 43, 194, "KickStock Kostic",     "KKOSTIC");
        _set(ids, names, symbols, 44, 195, "KickStock Sarmiento",  "KJSARMIENTO");
        _set(ids, names, symbols, 45, 196, "KickStock Sorloth",    "KSORLOTH");
        _set(ids, names, symbols, 46, 197, "KickStock Forsberg",   "KFORSBERG");
        _set(ids, names, symbols, 47, 198, "KickStock Semenyo",    "KSEMENYO");
        _set(ids, names, symbols, 48, 199, "KickStock Larin",      "KLARIN");
        _set(ids, names, symbols, 49, 200, "KickStock Ghoddos",    "KGHODDOS");

        market.listPlayersBatch(ids, names, symbols);
        console2.log("Batch 4 listed: 50 players (151-200)");
    }

    // ── Helper ────────────────────────────────────────────────────
    function _set(
        uint256[] memory ids,
        string[] memory names,
        string[] memory symbols,
        uint256 idx,
        uint256 id,
        string memory name_,
        string memory symbol_
    ) internal pure {
        ids[idx] = id;
        names[idx] = name_;
        symbols[idx] = symbol_;
    }
}
