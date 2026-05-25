/** @type {Array<{id: number, name: string, code: string, country: number, countryCode: string, countryName: string, position: string}>} */
const PLAYERS = [
  // 1 - Argentina
  { id: 1, name: "Lionel Messi", code: "MESSI", country: 1, countryCode: "ARG", countryName: "Argentina", position: "FW" },
  { id: 2, name: "Julian Alvarez", code: "JALVAREZ", country: 1, countryCode: "ARG", countryName: "Argentina", position: "FW" },
  { id: 3, name: "Enzo Fernandez", code: "ENZO", country: 1, countryCode: "ARG", countryName: "Argentina", position: "MF" },
  { id: 4, name: "Emiliano Martinez", code: "EMARTINEZ", country: 1, countryCode: "ARG", countryName: "Argentina", position: "GK" },

  // 2 - Brazil
  { id: 5, name: "Vinicius Junior", code: "VINICIUS", country: 2, countryCode: "BRA", countryName: "Brazil", position: "FW" },
  { id: 6, name: "Rodrygo", code: "RODRYGO", country: 2, countryCode: "BRA", countryName: "Brazil", position: "FW" },
  { id: 7, name: "Casemiro", code: "CASEMIRO", country: 2, countryCode: "BRA", countryName: "Brazil", position: "MF" },
  { id: 8, name: "Alisson", code: "ALISSON", country: 2, countryCode: "BRA", countryName: "Brazil", position: "GK" },

  // 3 - France
  { id: 9, name: "Kylian Mbappe", code: "MBAPPE", country: 3, countryCode: "FRA", countryName: "France", position: "FW" },
  { id: 10, name: "Antoine Griezmann", code: "GRIEZMANN", country: 3, countryCode: "FRA", countryName: "France", position: "FW" },
  { id: 11, name: "Aurelien Tchouameni", code: "TCHOUAMENI", country: 3, countryCode: "FRA", countryName: "France", position: "MF" },
  { id: 12, name: "Mike Maignan", code: "MAIGNAN", country: 3, countryCode: "FRA", countryName: "France", position: "GK" },

  // 4 - England
  { id: 13, name: "Jude Bellingham", code: "BELLINGHAM", country: 4, countryCode: "ENG", countryName: "England", position: "MF" },
  { id: 14, name: "Harry Kane", code: "KANE", country: 4, countryCode: "ENG", countryName: "England", position: "FW" },
  { id: 15, name: "Bukayo Saka", code: "SAKA", country: 4, countryCode: "ENG", countryName: "England", position: "FW" },
  { id: 16, name: "Declan Rice", code: "RICE", country: 4, countryCode: "ENG", countryName: "England", position: "MF" },

  // 5 - Spain
  { id: 17, name: "Lamine Yamal", code: "YAMAL", country: 5, countryCode: "ESP", countryName: "Spain", position: "FW" },
  { id: 18, name: "Pedri", code: "PEDRI", country: 5, countryCode: "ESP", countryName: "Spain", position: "MF" },
  { id: 19, name: "Rodri", code: "RODRI", country: 5, countryCode: "ESP", countryName: "Spain", position: "MF" },
  { id: 20, name: "Dani Carvajal", code: "CARVAJAL", country: 5, countryCode: "ESP", countryName: "Spain", position: "DF" },

  // 6 - Germany
  { id: 21, name: "Florian Wirtz", code: "WIRTZ", country: 6, countryCode: "GER", countryName: "Germany", position: "MF" },
  { id: 22, name: "Jamal Musiala", code: "MUSIALA", country: 6, countryCode: "GER", countryName: "Germany", position: "MF" },
  { id: 23, name: "Kai Havertz", code: "HAVERTZ", country: 6, countryCode: "GER", countryName: "Germany", position: "FW" },
  { id: 24, name: "Antonio Rudiger", code: "RUDIGER", country: 6, countryCode: "GER", countryName: "Germany", position: "DF" },

  // 7 - Netherlands
  { id: 25, name: "Virgil van Dijk", code: "VANDIJK", country: 7, countryCode: "NED", countryName: "Netherlands", position: "DF" },
  { id: 26, name: "Cody Gakpo", code: "GAKPO", country: 7, countryCode: "NED", countryName: "Netherlands", position: "FW" },
  { id: 27, name: "Frenkie de Jong", code: "FDEJONG", country: 7, countryCode: "NED", countryName: "Netherlands", position: "MF" },

  // 8 - Portugal
  { id: 28, name: "Cristiano Ronaldo", code: "RONALDO", country: 8, countryCode: "POR", countryName: "Portugal", position: "FW" },
  { id: 29, name: "Bruno Fernandes", code: "BFERNANDES", country: 8, countryCode: "POR", countryName: "Portugal", position: "MF" },
  { id: 30, name: "Bernardo Silva", code: "BSILVA", country: 8, countryCode: "POR", countryName: "Portugal", position: "MF" },
  { id: 31, name: "Rafael Leao", code: "LEAO", country: 8, countryCode: "POR", countryName: "Portugal", position: "FW" },

  // 9 - Belgium
  { id: 32, name: "Kevin De Bruyne", code: "DEBRUYNE", country: 9, countryCode: "BEL", countryName: "Belgium", position: "MF" },
  { id: 33, name: "Romelu Lukaku", code: "LUKAKU", country: 9, countryCode: "BEL", countryName: "Belgium", position: "FW" },
  { id: 34, name: "Jeremy Doku", code: "DOKU", country: 9, countryCode: "BEL", countryName: "Belgium", position: "FW" },

  // 10 - Croatia
  { id: 35, name: "Luka Modric", code: "MODRIC", country: 10, countryCode: "CRO", countryName: "Croatia", position: "MF" },
  { id: 36, name: "Mateo Kovacic", code: "KOVACIC", country: 10, countryCode: "CRO", countryName: "Croatia", position: "MF" },
  { id: 37, name: "Josko Gvardiol", code: "GVARDIOL", country: 10, countryCode: "CRO", countryName: "Croatia", position: "DF" },

  // 11 - Uruguay
  { id: 38, name: "Federico Valverde", code: "VALVERDE", country: 11, countryCode: "URU", countryName: "Uruguay", position: "MF" },
  { id: 39, name: "Darwin Nunez", code: "NUNEZ", country: 11, countryCode: "URU", countryName: "Uruguay", position: "FW" },
  { id: 40, name: "Ronald Araujo", code: "ARAUJO", country: 11, countryCode: "URU", countryName: "Uruguay", position: "DF" },

  // 12 - Colombia
  { id: 41, name: "Luis Diaz", code: "LDIAZ", country: 12, countryCode: "COL", countryName: "Colombia", position: "FW" },
  { id: 42, name: "James Rodriguez", code: "JAMES", country: 12, countryCode: "COL", countryName: "Colombia", position: "MF" },
  { id: 43, name: "Jhon Arias", code: "ARIAS", country: 12, countryCode: "COL", countryName: "Colombia", position: "FW" },

  // 13 - Japan
  { id: 44, name: "Takefusa Kubo", code: "KUBO", country: 13, countryCode: "JPN", countryName: "Japan", position: "FW" },
  { id: 45, name: "Kaoru Mitoma", code: "MITOMA", country: 13, countryCode: "JPN", countryName: "Japan", position: "FW" },
  { id: 46, name: "Wataru Endo", code: "ENDO", country: 13, countryCode: "JPN", countryName: "Japan", position: "MF" },

  // 14 - South Korea
  { id: 47, name: "Son Heung-min", code: "SON", country: 14, countryCode: "KOR", countryName: "South Korea", position: "FW" },
  { id: 48, name: "Kim Min-jae", code: "KIMMINJ", country: 14, countryCode: "KOR", countryName: "South Korea", position: "DF" },
  { id: 49, name: "Lee Kang-in", code: "LEEKANGIN", country: 14, countryCode: "KOR", countryName: "South Korea", position: "MF" },

  // 15 - Australia
  { id: 50, name: "Mathew Ryan", code: "MRYAN", country: 15, countryCode: "AUS", countryName: "Australia", position: "GK" },
  { id: 51, name: "Jackson Irvine", code: "IRVINE", country: 15, countryCode: "AUS", countryName: "Australia", position: "MF" },
  { id: 52, name: "Craig Goodwin", code: "GOODWIN", country: 15, countryCode: "AUS", countryName: "Australia", position: "FW" },

  // 16 - Saudi Arabia
  { id: 53, name: "Salem Al-Dawsari", code: "ALDAWSARI", country: 16, countryCode: "KSA", countryName: "Saudi Arabia", position: "FW" },
  { id: 54, name: "Mohammed Al-Owais", code: "ALOWAIS", country: 16, countryCode: "KSA", countryName: "Saudi Arabia", position: "GK" },

  // 17 - Iran
  { id: 55, name: "Mehdi Taremi", code: "TAREMI", country: 17, countryCode: "IRN", countryName: "Iran", position: "FW" },
  { id: 56, name: "Sardar Azmoun", code: "AZMOUN", country: 17, countryCode: "IRN", countryName: "Iran", position: "FW" },
  { id: 57, name: "Alireza Jahanbakhsh", code: "JAHANB", country: 17, countryCode: "IRN", countryName: "Iran", position: "MF" },

  // 18 - Qatar
  { id: 58, name: "Akram Afif", code: "AFIF", country: 18, countryCode: "QAT", countryName: "Qatar", position: "FW" },
  { id: 59, name: "Almoez Ali", code: "ALMOEZ", country: 18, countryCode: "QAT", countryName: "Qatar", position: "FW" },
  { id: 60, name: "Hassan Al-Haydos", code: "ALHAYDOS", country: 18, countryCode: "QAT", countryName: "Qatar", position: "MF" },

  // 19 - USA
  { id: 61, name: "Christian Pulisic", code: "PULISIC", country: 19, countryCode: "USA", countryName: "USA", position: "FW" },
  { id: 62, name: "Weston McKennie", code: "MCKENNIE", country: 19, countryCode: "USA", countryName: "USA", position: "MF" },
  { id: 63, name: "Tyler Adams", code: "TADAMS", country: 19, countryCode: "USA", countryName: "USA", position: "MF" },
  { id: 64, name: "Gio Reyna", code: "REYNA", country: 19, countryCode: "USA", countryName: "USA", position: "FW" },

  // 20 - Mexico
  { id: 65, name: "Hirving Lozano", code: "LOZANO", country: 20, countryCode: "MEX", countryName: "Mexico", position: "FW" },
  { id: 66, name: "Edson Alvarez", code: "EALVAREZ", country: 20, countryCode: "MEX", countryName: "Mexico", position: "MF" },
  { id: 67, name: "Guillermo Ochoa", code: "OCHOA", country: 20, countryCode: "MEX", countryName: "Mexico", position: "GK" },

  // 21 - Morocco
  { id: 68, name: "Achraf Hakimi", code: "HAKIMI", country: 21, countryCode: "MAR", countryName: "Morocco", position: "DF" },
  { id: 69, name: "Hakim Ziyech", code: "ZIYECH", country: 21, countryCode: "MAR", countryName: "Morocco", position: "MF" },
  { id: 70, name: "Youssef En-Nesyri", code: "ENNESYRI", country: 21, countryCode: "MAR", countryName: "Morocco", position: "FW" },

  // 22 - Senegal
  { id: 71, name: "Sadio Mane", code: "MANE", country: 22, countryCode: "SEN", countryName: "Senegal", position: "FW" },
  { id: 72, name: "Kalidou Koulibaly", code: "KOULIBALY", country: 22, countryCode: "SEN", countryName: "Senegal", position: "DF" },
  { id: 73, name: "Ismaila Sarr", code: "SARR", country: 22, countryCode: "SEN", countryName: "Senegal", position: "FW" },

  // 23 - Ghana
  { id: 74, name: "Mohammed Kudus", code: "KUDUS", country: 23, countryCode: "GHA", countryName: "Ghana", position: "MF" },
  { id: 75, name: "Thomas Partey", code: "PARTEY", country: 23, countryCode: "GHA", countryName: "Ghana", position: "MF" },
  { id: 76, name: "Inaki Williams", code: "IWILLIAMS", country: 23, countryCode: "GHA", countryName: "Ghana", position: "FW" },

  // 24 - Cameroon
  { id: 77, name: "Andre-Frank Zambo Anguissa", code: "ANGUISSA", country: 24, countryCode: "CMR", countryName: "Cameroon", position: "MF" },
  { id: 78, name: "Eric Maxim Choupo-Moting", code: "CHOUPO", country: 24, countryCode: "CMR", countryName: "Cameroon", position: "FW" },

  // 25 - Nigeria
  { id: 79, name: "Victor Osimhen", code: "OSIMHEN", country: 25, countryCode: "NGA", countryName: "Nigeria", position: "FW" },
  { id: 80, name: "Samuel Chukwueze", code: "CHUKWUEZE", country: 25, countryCode: "NGA", countryName: "Nigeria", position: "FW" },
  { id: 81, name: "Wilfred Ndidi", code: "NDIDI", country: 25, countryCode: "NGA", countryName: "Nigeria", position: "MF" },

  // 26 - Tunisia
  { id: 82, name: "Youssef Msakni", code: "MSAKNI", country: 26, countryCode: "TUN", countryName: "Tunisia", position: "FW" },
  { id: 83, name: "Ellyes Skhiri", code: "SKHIRI", country: 26, countryCode: "TUN", countryName: "Tunisia", position: "MF" },

  // 27 - Egypt
  { id: 84, name: "Mohamed Salah", code: "SALAH", country: 27, countryCode: "EGY", countryName: "Egypt", position: "FW" },
  { id: 85, name: "Omar Marmoush", code: "MARMOUSH", country: 27, countryCode: "EGY", countryName: "Egypt", position: "FW" },
  { id: 86, name: "Mohamed Elneny", code: "ELNENY", country: 27, countryCode: "EGY", countryName: "Egypt", position: "MF" },

  // 28 - Canada
  { id: 87, name: "Alphonso Davies", code: "DAVIES", country: 28, countryCode: "CAN", countryName: "Canada", position: "DF" },
  { id: 88, name: "Jonathan David", code: "JDAVID", country: 28, countryCode: "CAN", countryName: "Canada", position: "FW" },
  { id: 89, name: "Tajon Buchanan", code: "BUCHANAN", country: 28, countryCode: "CAN", countryName: "Canada", position: "FW" },

  // 29 - Ecuador
  { id: 90, name: "Moises Caicedo", code: "CAICEDO", country: 29, countryCode: "ECU", countryName: "Ecuador", position: "MF" },
  { id: 91, name: "Enner Valencia", code: "EVALENCIA", country: 29, countryCode: "ECU", countryName: "Ecuador", position: "FW" },
  { id: 92, name: "Piero Hincapie", code: "HINCAPIE", country: 29, countryCode: "ECU", countryName: "Ecuador", position: "DF" },

  // 30 - Chile
  { id: 93, name: "Alexis Sanchez", code: "ALEXIS", country: 30, countryCode: "CHI", countryName: "Chile", position: "FW" },
  { id: 94, name: "Arturo Vidal", code: "VIDAL", country: 30, countryCode: "CHI", countryName: "Chile", position: "MF" },

  // 31 - Peru
  { id: 95, name: "Paolo Guerrero", code: "GUERRERO", country: 31, countryCode: "PER", countryName: "Peru", position: "FW" },
  { id: 96, name: "Andre Carrillo", code: "CARRILLO", country: 31, countryCode: "PER", countryName: "Peru", position: "MF" },

  // 32 - Paraguay
  { id: 97, name: "Miguel Almiron", code: "ALMIRON", country: 32, countryCode: "PAR", countryName: "Paraguay", position: "MF" },
  { id: 98, name: "Julio Enciso", code: "ENCISO", country: 32, countryCode: "PAR", countryName: "Paraguay", position: "FW" },

  // 33 - Bolivia
  { id: 99, name: "Marcelo Martins", code: "MMARTINS", country: 33, countryCode: "BOL", countryName: "Bolivia", position: "FW" },
  { id: 100, name: "Ramiro Vaca", code: "VACA", country: 33, countryCode: "BOL", countryName: "Bolivia", position: "MF" },

  // 34 - Venezuela
  { id: 101, name: "Salomon Rondon", code: "RONDON", country: 34, countryCode: "VEN", countryName: "Venezuela", position: "FW" },
  { id: 102, name: "Yeferson Soteldo", code: "SOTELDO", country: 34, countryCode: "VEN", countryName: "Venezuela", position: "FW" },

  // 35 - Serbia
  { id: 103, name: "Dusan Vlahovic", code: "VLAHOVIC", country: 35, countryCode: "SRB", countryName: "Serbia", position: "FW" },
  { id: 104, name: "Sergej Milinkovic-Savic", code: "SMS", country: 35, countryCode: "SRB", countryName: "Serbia", position: "MF" },
  { id: 105, name: "Aleksandar Mitrovic", code: "MITROVIC", country: 35, countryCode: "SRB", countryName: "Serbia", position: "FW" },

  // 36 - Switzerland
  { id: 106, name: "Granit Xhaka", code: "XHAKA", country: 36, countryCode: "SUI", countryName: "Switzerland", position: "MF" },
  { id: 107, name: "Xherdan Shaqiri", code: "SHAQIRI", country: 36, countryCode: "SUI", countryName: "Switzerland", position: "FW" },
  { id: 108, name: "Manuel Akanji", code: "AKANJI", country: 36, countryCode: "SUI", countryName: "Switzerland", position: "DF" },

  // 37 - Denmark
  { id: 109, name: "Christian Eriksen", code: "ERIKSEN", country: 37, countryCode: "DEN", countryName: "Denmark", position: "MF" },
  { id: 110, name: "Rasmus Hojlund", code: "HOJLUND", country: 37, countryCode: "DEN", countryName: "Denmark", position: "FW" },
  { id: 111, name: "Pierre-Emile Hojbjerg", code: "HOJBJERG", country: 37, countryCode: "DEN", countryName: "Denmark", position: "MF" },

  // 38 - Poland
  { id: 112, name: "Robert Lewandowski", code: "LEWANDWSK", country: 38, countryCode: "POL", countryName: "Poland", position: "FW" },
  { id: 113, name: "Piotr Zielinski", code: "ZIELINSKI", country: 38, countryCode: "POL", countryName: "Poland", position: "MF" },
  { id: 114, name: "Wojciech Szczesny", code: "SZCZESNY", country: 38, countryCode: "POL", countryName: "Poland", position: "GK" },

  // 39 - Austria
  { id: 115, name: "David Alaba", code: "ALABA", country: 39, countryCode: "AUT", countryName: "Austria", position: "DF" },
  { id: 116, name: "Marcel Sabitzer", code: "SABITZER", country: 39, countryCode: "AUT", countryName: "Austria", position: "MF" },
  { id: 117, name: "Konrad Laimer", code: "LAIMER", country: 39, countryCode: "AUT", countryName: "Austria", position: "MF" },

  // 40 - Wales
  { id: 118, name: "Gareth Bale", code: "BALE", country: 40, countryCode: "WAL", countryName: "Wales", position: "FW" },
  { id: 119, name: "Aaron Ramsey", code: "RAMSEY", country: 40, countryCode: "WAL", countryName: "Wales", position: "MF" },
  { id: 120, name: "Brennan Johnson", code: "BJOHNSON", country: 40, countryCode: "WAL", countryName: "Wales", position: "FW" },

  // 41 - Scotland
  { id: 121, name: "Andrew Robertson", code: "ROBERTSON", country: 41, countryCode: "SCO", countryName: "Scotland", position: "DF" },
  { id: 122, name: "Scott McTominay", code: "MCTOMINAY", country: 41, countryCode: "SCO", countryName: "Scotland", position: "MF" },
  { id: 123, name: "John McGinn", code: "MCGINN", country: 41, countryCode: "SCO", countryName: "Scotland", position: "MF" },

  // 42 - Turkey
  { id: 124, name: "Hakan Calhanoglu", code: "CALHANOGLU", country: 42, countryCode: "TUR", countryName: "Turkey", position: "MF" },
  { id: 125, name: "Arda Guler", code: "AGULER", country: 42, countryCode: "TUR", countryName: "Turkey", position: "MF" },
  { id: 126, name: "Kenan Yildiz", code: "YILDIZ", country: 42, countryCode: "TUR", countryName: "Turkey", position: "FW" },

  // 43 - Ukraine
  { id: 127, name: "Mykhailo Mudryk", code: "MUDRYK", country: 43, countryCode: "UKR", countryName: "Ukraine", position: "FW" },
  { id: 128, name: "Oleksandr Zinchenko", code: "ZINCHENKO", country: 43, countryCode: "UKR", countryName: "Ukraine", position: "DF" },
  { id: 129, name: "Andriy Lunin", code: "LUNIN", country: 43, countryCode: "UKR", countryName: "Ukraine", position: "GK" },

  // 44 - Czech Republic
  { id: 130, name: "Patrik Schick", code: "SCHICK", country: 44, countryCode: "CZE", countryName: "Czech Republic", position: "FW" },
  { id: 131, name: "Tomas Soucek", code: "SOUCEK", country: 44, countryCode: "CZE", countryName: "Czech Republic", position: "MF" },
  { id: 132, name: "Vladimir Coufal", code: "COUFAL", country: 44, countryCode: "CZE", countryName: "Czech Republic", position: "DF" },

  // 45 - Sweden
  { id: 133, name: "Alexander Isak", code: "ISAK", country: 45, countryCode: "SWE", countryName: "Sweden", position: "FW" },
  { id: 134, name: "Dejan Kulusevski", code: "KULUSEVSKI", country: 45, countryCode: "SWE", countryName: "Sweden", position: "FW" },
  { id: 135, name: "Viktor Gyokeres", code: "GYOKERES", country: 45, countryCode: "SWE", countryName: "Sweden", position: "FW" },

  // 46 - Norway
  { id: 136, name: "Erling Haaland", code: "HAALAND", country: 46, countryCode: "NOR", countryName: "Norway", position: "FW" },
  { id: 137, name: "Martin Odegaard", code: "ODEGAARD", country: 46, countryCode: "NOR", countryName: "Norway", position: "MF" },
  { id: 138, name: "Sander Berge", code: "BERGE", country: 46, countryCode: "NOR", countryName: "Norway", position: "MF" },

  // 47 - Costa Rica
  { id: 139, name: "Keylor Navas", code: "NAVAS", country: 47, countryCode: "CRC", countryName: "Costa Rica", position: "GK" },
  { id: 140, name: "Joel Campbell", code: "CAMPBELL", country: 47, countryCode: "CRC", countryName: "Costa Rica", position: "FW" },
  { id: 141, name: "Bryan Ruiz", code: "BRUIZ", country: 47, countryCode: "CRC", countryName: "Costa Rica", position: "MF" },

  // 48 - Jamaica
  { id: 142, name: "Leon Bailey", code: "BAILEY", country: 48, countryCode: "JAM", countryName: "Jamaica", position: "FW" },
  { id: 143, name: "Michail Antonio", code: "ANTONIO", country: 48, countryCode: "JAM", countryName: "Jamaica", position: "FW" },
  { id: 144, name: "Bobby Decordova-Reid", code: "REID", country: 48, countryCode: "JAM", countryName: "Jamaica", position: "FW" },

  // Additional notable players
  { id: 145, name: "Endrick", code: "ENDRICK", country: 2, countryCode: "BRA", countryName: "Brazil", position: "FW" },
  { id: 146, name: "William Saliba", code: "SALIBA", country: 3, countryCode: "FRA", countryName: "France", position: "DF" },
  { id: 147, name: "Phil Foden", code: "FODEN", country: 4, countryCode: "ENG", countryName: "England", position: "MF" },
  { id: 148, name: "Gavi", code: "GAVI", country: 5, countryCode: "ESP", countryName: "Spain", position: "MF" },
  { id: 149, name: "Lisandro Martinez", code: "LMARTINEZ", country: 1, countryCode: "ARG", countryName: "Argentina", position: "DF" },
  { id: 150, name: "Thibaut Courtois", code: "COURTOIS", country: 9, countryCode: "BEL", countryName: "Belgium", position: "GK" },
];

module.exports = { PLAYERS };
