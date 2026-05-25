/**
 * KickStock — 2026 World Cup Player Roster
 * 150 star players across 48 teams (projected qualified nations)
 *
 * Hosts: USA, Mexico, Canada
 * AFC (8): Japan, South Korea, Australia, Iran, Saudi Arabia, Iraq, Qatar, Uzbekistan
 * CAF (9): Morocco, Senegal, Nigeria, Egypt, Cameroon, Ivory Coast, Algeria, Ghana, Tunisia
 * CONCACAF (3 non-host): Panama, Costa Rica, Jamaica
 * CONMEBOL (6): Argentina, Brazil, Uruguay, Colombia, Ecuador, Paraguay
 * UEFA (16): France, England, Spain, Germany, Netherlands, Portugal, Belgium, Croatia,
 *            Italy, Switzerland, Denmark, Poland, Austria, Turkey, Serbia, Ukraine
 *
 * @type {Array<{id: number, name: string, code: string, country: number, countryCode: string, countryName: string, position: string}>}
 */
const PLAYERS = [
  // ─── 1 · Argentina ──────────────────────────────────────────
  { id: 1,   name: "Lionel Messi",        code: "MESSI",      country: 1,  countryCode: "ARG", countryName: "Argentina",      position: "FW" },
  { id: 2,   name: "Julian Alvarez",      code: "JALVAREZ",   country: 1,  countryCode: "ARG", countryName: "Argentina",      position: "FW" },
  { id: 3,   name: "Enzo Fernandez",      code: "ENZO",       country: 1,  countryCode: "ARG", countryName: "Argentina",      position: "MF" },
  { id: 4,   name: "Emiliano Martinez",   code: "EMARTINEZ",  country: 1,  countryCode: "ARG", countryName: "Argentina",      position: "GK" },
  { id: 5,   name: "Lisandro Martinez",   code: "LMARTINEZ",  country: 1,  countryCode: "ARG", countryName: "Argentina",      position: "DF" },

  // ─── 2 · Brazil ─────────────────────────────────────────────
  { id: 6,   name: "Vinicius Junior",     code: "VINICIUS",   country: 2,  countryCode: "BRA", countryName: "Brazil",         position: "FW" },
  { id: 7,   name: "Rodrygo",             code: "RODRYGO",    country: 2,  countryCode: "BRA", countryName: "Brazil",         position: "FW" },
  { id: 8,   name: "Endrick",             code: "ENDRICK",    country: 2,  countryCode: "BRA", countryName: "Brazil",         position: "FW" },
  { id: 9,   name: "Bruno Guimaraes",     code: "BGUIMA",     country: 2,  countryCode: "BRA", countryName: "Brazil",         position: "MF" },
  { id: 10,  name: "Alisson",             code: "ALISSON",    country: 2,  countryCode: "BRA", countryName: "Brazil",         position: "GK" },

  // ─── 3 · France ─────────────────────────────────────────────
  { id: 11,  name: "Kylian Mbappe",       code: "MBAPPE",     country: 3,  countryCode: "FRA", countryName: "France",         position: "FW" },
  { id: 12,  name: "Antoine Griezmann",   code: "GRIEZMANN",  country: 3,  countryCode: "FRA", countryName: "France",         position: "FW" },
  { id: 13,  name: "Aurelien Tchouameni", code: "TCHOUAMENI", country: 3,  countryCode: "FRA", countryName: "France",         position: "MF" },
  { id: 14,  name: "William Saliba",      code: "SALIBA",     country: 3,  countryCode: "FRA", countryName: "France",         position: "DF" },
  { id: 15,  name: "Mike Maignan",        code: "MAIGNAN",    country: 3,  countryCode: "FRA", countryName: "France",         position: "GK" },

  // ─── 4 · England ────────────────────────────────────────────
  { id: 16,  name: "Jude Bellingham",     code: "BELLINGHAM", country: 4,  countryCode: "ENG", countryName: "England",        position: "MF" },
  { id: 17,  name: "Harry Kane",          code: "KANE",       country: 4,  countryCode: "ENG", countryName: "England",        position: "FW" },
  { id: 18,  name: "Bukayo Saka",         code: "SAKA",       country: 4,  countryCode: "ENG", countryName: "England",        position: "FW" },
  { id: 19,  name: "Phil Foden",          code: "FODEN",      country: 4,  countryCode: "ENG", countryName: "England",        position: "MF" },
  { id: 20,  name: "Declan Rice",         code: "RICE",       country: 4,  countryCode: "ENG", countryName: "England",        position: "MF" },

  // ─── 5 · Spain ──────────────────────────────────────────────
  { id: 21,  name: "Lamine Yamal",        code: "YAMAL",      country: 5,  countryCode: "ESP", countryName: "Spain",          position: "FW" },
  { id: 22,  name: "Pedri",               code: "PEDRI",      country: 5,  countryCode: "ESP", countryName: "Spain",          position: "MF" },
  { id: 23,  name: "Rodri",               code: "RODRI",      country: 5,  countryCode: "ESP", countryName: "Spain",          position: "MF" },
  { id: 24,  name: "Dani Carvajal",       code: "CARVAJAL",   country: 5,  countryCode: "ESP", countryName: "Spain",          position: "DF" },
  { id: 25,  name: "Gavi",                code: "GAVI",       country: 5,  countryCode: "ESP", countryName: "Spain",          position: "MF" },

  // ─── 6 · Germany ────────────────────────────────────────────
  { id: 26,  name: "Florian Wirtz",       code: "WIRTZ",      country: 6,  countryCode: "GER", countryName: "Germany",        position: "MF" },
  { id: 27,  name: "Jamal Musiala",       code: "MUSIALA",    country: 6,  countryCode: "GER", countryName: "Germany",        position: "MF" },
  { id: 28,  name: "Kai Havertz",         code: "HAVERTZ",    country: 6,  countryCode: "GER", countryName: "Germany",        position: "FW" },
  { id: 29,  name: "Antonio Rudiger",     code: "RUDIGER",    country: 6,  countryCode: "GER", countryName: "Germany",        position: "DF" },

  // ─── 7 · Netherlands ────────────────────────────────────────
  { id: 30,  name: "Virgil van Dijk",     code: "VANDIJK",    country: 7,  countryCode: "NED", countryName: "Netherlands",    position: "DF" },
  { id: 31,  name: "Cody Gakpo",          code: "GAKPO",      country: 7,  countryCode: "NED", countryName: "Netherlands",    position: "FW" },
  { id: 32,  name: "Frenkie de Jong",     code: "FDEJONG",    country: 7,  countryCode: "NED", countryName: "Netherlands",    position: "MF" },
  { id: 33,  name: "Xavi Simons",         code: "XSIMONS",    country: 7,  countryCode: "NED", countryName: "Netherlands",    position: "MF" },

  // ─── 8 · Portugal ───────────────────────────────────────────
  { id: 34,  name: "Cristiano Ronaldo",   code: "RONALDO",    country: 8,  countryCode: "POR", countryName: "Portugal",       position: "FW" },
  { id: 35,  name: "Bruno Fernandes",     code: "BFERNANDES", country: 8,  countryCode: "POR", countryName: "Portugal",       position: "MF" },
  { id: 36,  name: "Bernardo Silva",      code: "BSILVA",     country: 8,  countryCode: "POR", countryName: "Portugal",       position: "MF" },
  { id: 37,  name: "Rafael Leao",         code: "LEAO",       country: 8,  countryCode: "POR", countryName: "Portugal",       position: "FW" },

  // ─── 9 · Belgium ────────────────────────────────────────────
  { id: 38,  name: "Kevin De Bruyne",     code: "DEBRUYNE",   country: 9,  countryCode: "BEL", countryName: "Belgium",        position: "MF" },
  { id: 39,  name: "Romelu Lukaku",       code: "LUKAKU",     country: 9,  countryCode: "BEL", countryName: "Belgium",        position: "FW" },
  { id: 40,  name: "Thibaut Courtois",    code: "COURTOIS",   country: 9,  countryCode: "BEL", countryName: "Belgium",        position: "GK" },

  // ─── 10 · Croatia ───────────────────────────────────────────
  { id: 41,  name: "Luka Modric",         code: "MODRIC",     country: 10, countryCode: "CRO", countryName: "Croatia",        position: "MF" },
  { id: 42,  name: "Mateo Kovacic",       code: "KOVACIC",    country: 10, countryCode: "CRO", countryName: "Croatia",        position: "MF" },
  { id: 43,  name: "Josko Gvardiol",      code: "GVARDIOL",   country: 10, countryCode: "CRO", countryName: "Croatia",        position: "DF" },

  // ─── 11 · Italy ─────────────────────────────────────────────
  { id: 44,  name: "Gianluigi Donnarumma",code: "DONNARUMMA", country: 11, countryCode: "ITA", countryName: "Italy",          position: "GK" },
  { id: 45,  name: "Nicolo Barella",      code: "BARELLA",    country: 11, countryCode: "ITA", countryName: "Italy",          position: "MF" },
  { id: 46,  name: "Federico Chiesa",     code: "CHIESA",     country: 11, countryCode: "ITA", countryName: "Italy",          position: "FW" },
  { id: 47,  name: "Alessandro Bastoni",  code: "BASTONI",    country: 11, countryCode: "ITA", countryName: "Italy",          position: "DF" },

  // ─── 12 · Uruguay ───────────────────────────────────────────
  { id: 48,  name: "Federico Valverde",   code: "VALVERDE",   country: 12, countryCode: "URU", countryName: "Uruguay",        position: "MF" },
  { id: 49,  name: "Darwin Nunez",        code: "NUNEZ",      country: 12, countryCode: "URU", countryName: "Uruguay",        position: "FW" },
  { id: 50,  name: "Ronald Araujo",       code: "ARAUJO",     country: 12, countryCode: "URU", countryName: "Uruguay",        position: "DF" },

  // ─── 13 · Colombia ──────────────────────────────────────────
  { id: 51,  name: "Luis Diaz",           code: "LDIAZ",      country: 13, countryCode: "COL", countryName: "Colombia",       position: "FW" },
  { id: 52,  name: "James Rodriguez",     code: "JAMES",      country: 13, countryCode: "COL", countryName: "Colombia",       position: "MF" },
  { id: 53,  name: "Jhon Arias",          code: "JHARIAS",    country: 13, countryCode: "COL", countryName: "Colombia",       position: "FW" },

  // ─── 14 · Japan ─────────────────────────────────────────────
  { id: 54,  name: "Takefusa Kubo",       code: "KUBO",       country: 14, countryCode: "JPN", countryName: "Japan",          position: "FW" },
  { id: 55,  name: "Kaoru Mitoma",        code: "MITOMA",     country: 14, countryCode: "JPN", countryName: "Japan",          position: "FW" },
  { id: 56,  name: "Wataru Endo",         code: "ENDO",       country: 14, countryCode: "JPN", countryName: "Japan",          position: "MF" },

  // ─── 15 · South Korea ───────────────────────────────────────
  { id: 57,  name: "Son Heung-min",       code: "SON",        country: 15, countryCode: "KOR", countryName: "South Korea",    position: "FW" },
  { id: 58,  name: "Kim Min-jae",         code: "KIMMINJAE",  country: 15, countryCode: "KOR", countryName: "South Korea",    position: "DF" },
  { id: 59,  name: "Lee Kang-in",         code: "LEEKANGIN",  country: 15, countryCode: "KOR", countryName: "South Korea",    position: "MF" },

  // ─── 16 · USA ───────────────────────────────────────────────
  { id: 60,  name: "Christian Pulisic",   code: "PULISIC",    country: 16, countryCode: "USA", countryName: "USA",            position: "FW" },
  { id: 61,  name: "Weston McKennie",     code: "MCKENNIE",   country: 16, countryCode: "USA", countryName: "USA",            position: "MF" },
  { id: 62,  name: "Tyler Adams",         code: "TADAMS",     country: 16, countryCode: "USA", countryName: "USA",            position: "MF" },
  { id: 63,  name: "Gio Reyna",           code: "REYNA",      country: 16, countryCode: "USA", countryName: "USA",            position: "FW" },

  // ─── 17 · Mexico ────────────────────────────────────────────
  { id: 64,  name: "Hirving Lozano",      code: "LOZANO",     country: 17, countryCode: "MEX", countryName: "Mexico",         position: "FW" },
  { id: 65,  name: "Edson Alvarez",       code: "EALVAREZ",   country: 17, countryCode: "MEX", countryName: "Mexico",         position: "MF" },
  { id: 66,  name: "Santiago Gimenez",    code: "SGIMENEZ",   country: 17, countryCode: "MEX", countryName: "Mexico",         position: "FW" },

  // ─── 18 · Canada ────────────────────────────────────────────
  { id: 67,  name: "Alphonso Davies",     code: "DAVIES",     country: 18, countryCode: "CAN", countryName: "Canada",         position: "DF" },
  { id: 68,  name: "Jonathan David",      code: "JDAVID",     country: 18, countryCode: "CAN", countryName: "Canada",         position: "FW" },
  { id: 69,  name: "Tajon Buchanan",      code: "BUCHANAN",   country: 18, countryCode: "CAN", countryName: "Canada",         position: "FW" },

  // ─── 19 · Morocco ───────────────────────────────────────────
  { id: 70,  name: "Achraf Hakimi",       code: "HAKIMI",     country: 19, countryCode: "MAR", countryName: "Morocco",        position: "DF" },
  { id: 71,  name: "Hakim Ziyech",        code: "ZIYECH",     country: 19, countryCode: "MAR", countryName: "Morocco",        position: "MF" },
  { id: 72,  name: "Youssef En-Nesyri",   code: "ENNESYRI",   country: 19, countryCode: "MAR", countryName: "Morocco",        position: "FW" },
  { id: 73,  name: "Brahim Diaz",         code: "BDIAZ",      country: 19, countryCode: "MAR", countryName: "Morocco",        position: "MF" },

  // ─── 20 · Senegal ───────────────────────────────────────────
  { id: 74,  name: "Sadio Mane",          code: "MANE",       country: 20, countryCode: "SEN", countryName: "Senegal",        position: "FW" },
  { id: 75,  name: "Kalidou Koulibaly",   code: "KOULIBALY",  country: 20, countryCode: "SEN", countryName: "Senegal",        position: "DF" },
  { id: 76,  name: "Ismaila Sarr",        code: "ISARR",      country: 20, countryCode: "SEN", countryName: "Senegal",        position: "FW" },

  // ─── 21 · Nigeria ───────────────────────────────────────────
  { id: 77,  name: "Victor Osimhen",      code: "OSIMHEN",    country: 21, countryCode: "NGA", countryName: "Nigeria",        position: "FW" },
  { id: 78,  name: "Samuel Chukwueze",    code: "CHUKWUEZE",  country: 21, countryCode: "NGA", countryName: "Nigeria",        position: "FW" },
  { id: 79,  name: "Wilfred Ndidi",       code: "NDIDI",      country: 21, countryCode: "NGA", countryName: "Nigeria",        position: "MF" },

  // ─── 22 · Egypt ─────────────────────────────────────────────
  { id: 80,  name: "Mohamed Salah",       code: "SALAH",      country: 22, countryCode: "EGY", countryName: "Egypt",          position: "FW" },
  { id: 81,  name: "Omar Marmoush",       code: "MARMOUSH",   country: 22, countryCode: "EGY", countryName: "Egypt",          position: "FW" },
  { id: 82,  name: "Mohamed Elneny",      code: "ELNENY",     country: 22, countryCode: "EGY", countryName: "Egypt",          position: "MF" },

  // ─── 23 · Cameroon ──────────────────────────────────────────
  { id: 83,  name: "Andre-Frank Zambo Anguissa", code: "ANGUISSA", country: 23, countryCode: "CMR", countryName: "Cameroon", position: "MF" },
  { id: 84,  name: "Eric Maxim Choupo-Moting",  code: "CHOUPO",   country: 23, countryCode: "CMR", countryName: "Cameroon", position: "FW" },

  // ─── 24 · Ivory Coast ───────────────────────────────────────
  { id: 85,  name: "Sebastien Haller",    code: "HALLER",     country: 24, countryCode: "CIV", countryName: "Ivory Coast",    position: "FW" },
  { id: 86,  name: "Franck Kessie",       code: "KESSIE",     country: 24, countryCode: "CIV", countryName: "Ivory Coast",    position: "MF" },
  { id: 87,  name: "Simon Adingra",       code: "ADINGRA",    country: 24, countryCode: "CIV", countryName: "Ivory Coast",    position: "FW" },

  // ─── 25 · Algeria ───────────────────────────────────────────
  { id: 88,  name: "Riyad Mahrez",        code: "MAHREZ",     country: 25, countryCode: "ALG", countryName: "Algeria",        position: "FW" },
  { id: 89,  name: "Ismael Bennacer",     code: "BENNACER",   country: 25, countryCode: "ALG", countryName: "Algeria",        position: "MF" },
  { id: 90,  name: "Amine Gouiri",        code: "GOUIRI",     country: 25, countryCode: "ALG", countryName: "Algeria",        position: "FW" },

  // ─── 26 · Ghana ─────────────────────────────────────────────
  { id: 91,  name: "Mohammed Kudus",      code: "KUDUS",      country: 26, countryCode: "GHA", countryName: "Ghana",          position: "MF" },
  { id: 92,  name: "Thomas Partey",       code: "PARTEY",     country: 26, countryCode: "GHA", countryName: "Ghana",          position: "MF" },
  { id: 93,  name: "Inaki Williams",      code: "IWILLIAMS",  country: 26, countryCode: "GHA", countryName: "Ghana",          position: "FW" },

  // ─── 27 · Tunisia ───────────────────────────────────────────
  { id: 94,  name: "Youssef Msakni",      code: "MSAKNI",     country: 27, countryCode: "TUN", countryName: "Tunisia",        position: "FW" },
  { id: 95,  name: "Ellyes Skhiri",       code: "SKHIRI",     country: 27, countryCode: "TUN", countryName: "Tunisia",        position: "MF" },

  // ─── 28 · Saudi Arabia ──────────────────────────────────────
  { id: 96,  name: "Salem Al-Dawsari",    code: "ALDAWSARI",  country: 28, countryCode: "KSA", countryName: "Saudi Arabia",   position: "FW" },
  { id: 97,  name: "Mohammed Al-Owais",   code: "ALOWAIS",    country: 28, countryCode: "KSA", countryName: "Saudi Arabia",   position: "GK" },

  // ─── 29 · Iran ──────────────────────────────────────────────
  { id: 98,  name: "Mehdi Taremi",        code: "TAREMI",     country: 29, countryCode: "IRN", countryName: "Iran",           position: "FW" },
  { id: 99,  name: "Sardar Azmoun",       code: "AZMOUN",     country: 29, countryCode: "IRN", countryName: "Iran",           position: "FW" },
  { id: 100, name: "Alireza Jahanbakhsh", code: "JAHANB",     country: 29, countryCode: "IRN", countryName: "Iran",           position: "MF" },

  // ─── 30 · Australia ─────────────────────────────────────────
  { id: 101, name: "Mathew Ryan",         code: "MRYAN",      country: 30, countryCode: "AUS", countryName: "Australia",      position: "GK" },
  { id: 102, name: "Jackson Irvine",      code: "IRVINE",     country: 30, countryCode: "AUS", countryName: "Australia",      position: "MF" },
  { id: 103, name: "Craig Goodwin",       code: "GOODWIN",    country: 30, countryCode: "AUS", countryName: "Australia",      position: "FW" },

  // ─── 31 · Qatar ─────────────────────────────────────────────
  { id: 104, name: "Akram Afif",          code: "AFIF",       country: 31, countryCode: "QAT", countryName: "Qatar",          position: "FW" },
  { id: 105, name: "Almoez Ali",          code: "ALMOEZ",     country: 31, countryCode: "QAT", countryName: "Qatar",          position: "FW" },

  // ─── 32 · Iraq ──────────────────────────────────────────────
  { id: 106, name: "Mohanad Ali",         code: "MOHANAD",    country: 32, countryCode: "IRQ", countryName: "Iraq",           position: "FW" },
  { id: 107, name: "Aymen Hussein",       code: "AHUSSEIN",   country: 32, countryCode: "IRQ", countryName: "Iraq",           position: "FW" },

  // ─── 33 · Uzbekistan ────────────────────────────────────────
  { id: 108, name: "Eldor Shomurodov",    code: "SHOMURODOV", country: 33, countryCode: "UZB", countryName: "Uzbekistan",     position: "FW" },
  { id: 109, name: "Abbosbek Fayzullaev", code: "FAYZULL",    country: 33, countryCode: "UZB", countryName: "Uzbekistan",     position: "FW" },

  // ─── 34 · Switzerland ───────────────────────────────────────
  { id: 110, name: "Granit Xhaka",        code: "XHAKA",      country: 34, countryCode: "SUI", countryName: "Switzerland",    position: "MF" },
  { id: 111, name: "Manuel Akanji",       code: "AKANJI",     country: 34, countryCode: "SUI", countryName: "Switzerland",    position: "DF" },
  { id: 112, name: "Breel Embolo",        code: "EMBOLO",     country: 34, countryCode: "SUI", countryName: "Switzerland",    position: "FW" },

  // ─── 35 · Denmark ───────────────────────────────────────────
  { id: 113, name: "Christian Eriksen",   code: "ERIKSEN",    country: 35, countryCode: "DEN", countryName: "Denmark",        position: "MF" },
  { id: 114, name: "Rasmus Hojlund",      code: "HOJLUND",    country: 35, countryCode: "DEN", countryName: "Denmark",        position: "FW" },
  { id: 115, name: "Pierre-Emile Hojbjerg", code: "HOJBJERG", country: 35, countryCode: "DEN", countryName: "Denmark",        position: "MF" },

  // ─── 36 · Poland ────────────────────────────────────────────
  { id: 116, name: "Robert Lewandowski",  code: "LEWANDWSK",  country: 36, countryCode: "POL", countryName: "Poland",         position: "FW" },
  { id: 117, name: "Piotr Zielinski",     code: "ZIELINSKI",  country: 36, countryCode: "POL", countryName: "Poland",         position: "MF" },
  { id: 118, name: "Wojciech Szczesny",   code: "SZCZESNY",   country: 36, countryCode: "POL", countryName: "Poland",         position: "GK" },

  // ─── 37 · Austria ───────────────────────────────────────────
  { id: 119, name: "David Alaba",         code: "ALABA",      country: 37, countryCode: "AUT", countryName: "Austria",        position: "DF" },
  { id: 120, name: "Marcel Sabitzer",     code: "SABITZER",   country: 37, countryCode: "AUT", countryName: "Austria",        position: "MF" },
  { id: 121, name: "Konrad Laimer",       code: "LAIMER",     country: 37, countryCode: "AUT", countryName: "Austria",        position: "MF" },

  // ─── 38 · Turkey ────────────────────────────────────────────
  { id: 122, name: "Hakan Calhanoglu",    code: "CALHANOGL",  country: 38, countryCode: "TUR", countryName: "Turkey",         position: "MF" },
  { id: 123, name: "Arda Guler",          code: "AGULER",     country: 38, countryCode: "TUR", countryName: "Turkey",         position: "MF" },
  { id: 124, name: "Kenan Yildiz",        code: "YILDIZ",     country: 38, countryCode: "TUR", countryName: "Turkey",         position: "FW" },

  // ─── 39 · Serbia ────────────────────────────────────────────
  { id: 125, name: "Dusan Vlahovic",      code: "VLAHOVIC",   country: 39, countryCode: "SRB", countryName: "Serbia",         position: "FW" },
  { id: 126, name: "Aleksandar Mitrovic", code: "MITROVIC",   country: 39, countryCode: "SRB", countryName: "Serbia",         position: "FW" },
  { id: 127, name: "Sergej Milinkovic-Savic", code: "SMS",    country: 39, countryCode: "SRB", countryName: "Serbia",         position: "MF" },

  // ─── 40 · Ukraine ───────────────────────────────────────────
  { id: 128, name: "Mykhailo Mudryk",     code: "MUDRYK",     country: 40, countryCode: "UKR", countryName: "Ukraine",        position: "FW" },
  { id: 129, name: "Oleksandr Zinchenko", code: "ZINCHENKO",  country: 40, countryCode: "UKR", countryName: "Ukraine",        position: "DF" },
  { id: 130, name: "Andriy Lunin",        code: "LUNIN",      country: 40, countryCode: "UKR", countryName: "Ukraine",        position: "GK" },

  // ─── 41 · Ecuador ───────────────────────────────────────────
  { id: 131, name: "Moises Caicedo",      code: "CAICEDO",    country: 41, countryCode: "ECU", countryName: "Ecuador",        position: "MF" },
  { id: 132, name: "Enner Valencia",      code: "EVALENCIA",  country: 41, countryCode: "ECU", countryName: "Ecuador",        position: "FW" },
  { id: 133, name: "Piero Hincapie",      code: "HINCAPIE",   country: 41, countryCode: "ECU", countryName: "Ecuador",        position: "DF" },

  // ─── 42 · Paraguay ──────────────────────────────────────────
  { id: 134, name: "Miguel Almiron",      code: "ALMIRON",    country: 42, countryCode: "PAR", countryName: "Paraguay",       position: "MF" },
  { id: 135, name: "Julio Enciso",        code: "ENCISO",     country: 42, countryCode: "PAR", countryName: "Paraguay",       position: "FW" },

  // ─── 43 · Panama ────────────────────────────────────────────
  { id: 136, name: "Jose Fajardo",        code: "FAJARDO",    country: 43, countryCode: "PAN", countryName: "Panama",         position: "FW" },
  { id: 137, name: "Adalberto Carrasquilla", code: "CARRASQ",  country: 43, countryCode: "PAN", countryName: "Panama",         position: "MF" },

  // ─── 44 · Costa Rica ────────────────────────────────────────
  { id: 138, name: "Keylor Navas",        code: "NAVAS",      country: 44, countryCode: "CRC", countryName: "Costa Rica",     position: "GK" },
  { id: 139, name: "Joel Campbell",       code: "CAMPBELL",   country: 44, countryCode: "CRC", countryName: "Costa Rica",     position: "FW" },

  // ─── 45 · Jamaica ───────────────────────────────────────────
  { id: 140, name: "Leon Bailey",         code: "BAILEY",     country: 45, countryCode: "JAM", countryName: "Jamaica",        position: "FW" },
  { id: 141, name: "Michail Antonio",     code: "ANTONIO",    country: 45, countryCode: "JAM", countryName: "Jamaica",        position: "FW" },

  // ─── 46 · Norway ────────────────────────────────────────────
  { id: 142, name: "Erling Haaland",      code: "HAALAND",    country: 46, countryCode: "NOR", countryName: "Norway",         position: "FW" },
  { id: 143, name: "Martin Odegaard",     code: "ODEGAARD",   country: 46, countryCode: "NOR", countryName: "Norway",         position: "MF" },
  { id: 144, name: "Sander Berge",        code: "BERGE",      country: 46, countryCode: "NOR", countryName: "Norway",         position: "MF" },

  // ─── 47 · Sweden ────────────────────────────────────────────
  { id: 145, name: "Alexander Isak",      code: "ISAK",       country: 47, countryCode: "SWE", countryName: "Sweden",         position: "FW" },
  { id: 146, name: "Dejan Kulusevski",    code: "KULUSEVSK",  country: 47, countryCode: "SWE", countryName: "Sweden",         position: "FW" },
  { id: 147, name: "Viktor Gyokeres",     code: "GYOKERES",   country: 47, countryCode: "SWE", countryName: "Sweden",         position: "FW" },

  // ─── 48 · Scotland ──────────────────────────────────────────
  { id: 148, name: "Andrew Robertson",    code: "ROBERTSON",  country: 48, countryCode: "SCO", countryName: "Scotland",       position: "DF" },
  { id: 149, name: "Scott McTominay",     code: "MCTOMINAY",  country: 48, countryCode: "SCO", countryName: "Scotland",       position: "MF" },
  { id: 150, name: "John McGinn",         code: "MCGINN",     country: 48, countryCode: "SCO", countryName: "Scotland",       position: "MF" },
];

// ─── Derived helpers ──────────────────────────────────────────
const COUNTRIES = [...new Set(PLAYERS.map(p => p.countryName))];
const PLAYER_BY_ID = Object.fromEntries(PLAYERS.map(p => [p.id, p]));
const PLAYERS_BY_COUNTRY = PLAYERS.reduce((acc, p) => {
  (acc[p.countryCode] = acc[p.countryCode] || []).push(p);
  return acc;
}, {});

module.exports = { PLAYERS, COUNTRIES, PLAYER_BY_ID, PLAYERS_BY_COUNTRY };
