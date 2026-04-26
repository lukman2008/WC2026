export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  stadium: string;
  city: string;
  date: string;
  time: string;
  dateObj: Date;
  group: string;
  stage: string;
  ticketsAvailable: {
    vip: number;
    regular: number;
    economy: number;
  };
  prices: {
    vip: number;
    regular: number;
    economy: number;
  };
  stadiumImage: string;
}

const flagEmoji: Record<string, string> = {
  Brazil: "🇧🇷", Argentina: "🇦🇷", France: "🇫🇷", Germany: "🇩🇪",
  Spain: "🇪🇸", England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", Portugal: "🇵🇹", Netherlands: "🇳🇱",
  Italy: "🇮🇹", Belgium: "🇧🇪", Japan: "🇯🇵", "South Korea": "🇰🇷",
  USA: "🇺🇸", Mexico: "🇲🇽", Canada: "🇨🇦", Morocco: "🇲🇦",
  Senegal: "🇸🇳", Nigeria: "🇳🇬", Ghana: "🇬🇭", Cameroon: "🇨🇲",
  Australia: "🇦🇺", "Saudi Arabia": "🇸🇦", Uruguay: "🇺🇾", Croatia: "🇭🇷",
  Colombia: "🇨🇴", Ecuador: "🇪🇨", Switzerland: "🇨🇭", Denmark: "🇩🇰",
  Serbia: "🇷🇸", Poland: "🇵🇱", Tunisia: "🇹🇳", "Costa Rica": "🇨🇷",
};

export const matches: Match[] = [
  {
    id: "m1", homeTeam: "USA", awayTeam: "England", homeFlag: flagEmoji.USA, awayFlag: flagEmoji.England,
    stadium: "MetLife Stadium", city: "New York", date: "2026-06-11", time: "18:00", dateObj: new Date("2026-06-11T18:00"),
    group: "Group A", stage: "Group Stage",
    ticketsAvailable: { vip: 120, regular: 800, economy: 2000 },
    prices: { vip: 750, regular: 350, economy: 125 },
    stadiumImage: "",
  },
  {
    id: "m2", homeTeam: "Brazil", awayTeam: "Germany", homeFlag: flagEmoji.Brazil, awayFlag: flagEmoji.Germany,
    stadium: "SoFi Stadium", city: "Los Angeles", date: "2026-06-12", time: "20:00", dateObj: new Date("2026-06-12T20:00"),
    group: "Group B", stage: "Group Stage",
    ticketsAvailable: { vip: 85, regular: 600, economy: 1800 },
    prices: { vip: 850, regular: 400, economy: 150 },
    stadiumImage: "",
  },
  {
    id: "m3", homeTeam: "France", awayTeam: "Argentina", homeFlag: flagEmoji.France, awayFlag: flagEmoji.Argentina,
    stadium: "AT&T Stadium", city: "Dallas", date: "2026-06-13", time: "19:00", dateObj: new Date("2026-06-13T19:00"),
    group: "Group C", stage: "Group Stage",
    ticketsAvailable: { vip: 95, regular: 700, economy: 2200 },
    prices: { vip: 900, regular: 420, economy: 160 },
    stadiumImage: "",
  },
  {
    id: "m4", homeTeam: "Spain", awayTeam: "Netherlands", homeFlag: flagEmoji.Spain, awayFlag: flagEmoji.Netherlands,
    stadium: "Hard Rock Stadium", city: "Miami", date: "2026-06-14", time: "17:00", dateObj: new Date("2026-06-14T17:00"),
    group: "Group D", stage: "Group Stage",
    ticketsAvailable: { vip: 110, regular: 750, economy: 1900 },
    prices: { vip: 700, regular: 320, economy: 120 },
    stadiumImage: "",
  },
  {
    id: "m5", homeTeam: "Portugal", awayTeam: "Italy", homeFlag: flagEmoji.Portugal, awayFlag: flagEmoji.Italy,
    stadium: "Lumen Field", city: "Seattle", date: "2026-06-15", time: "21:00", dateObj: new Date("2026-06-15T21:00"),
    group: "Group E", stage: "Group Stage",
    ticketsAvailable: { vip: 70, regular: 500, economy: 1600 },
    prices: { vip: 800, regular: 380, economy: 140 },
    stadiumImage: "",
  },
  {
    id: "m6", homeTeam: "Mexico", awayTeam: "Japan", homeFlag: flagEmoji.Mexico, awayFlag: flagEmoji.Japan,
    stadium: "Estadio Azteca", city: "Mexico City", date: "2026-06-16", time: "16:00", dateObj: new Date("2026-06-16T16:00"),
    group: "Group F", stage: "Group Stage",
    ticketsAvailable: { vip: 130, regular: 900, economy: 2500 },
    prices: { vip: 650, regular: 300, economy: 100 },
    stadiumImage: "",
  },
  {
    id: "m7", homeTeam: "Belgium", awayTeam: "Croatia", homeFlag: flagEmoji.Belgium, awayFlag: flagEmoji.Croatia,
    stadium: "BMO Field", city: "Toronto", date: "2026-06-17", time: "18:00", dateObj: new Date("2026-06-17T18:00"),
    group: "Group G", stage: "Group Stage",
    ticketsAvailable: { vip: 100, regular: 650, economy: 1700 },
    prices: { vip: 680, regular: 310, economy: 115 },
    stadiumImage: "",
  },
  {
    id: "m8", homeTeam: "Morocco", awayTeam: "Colombia", homeFlag: flagEmoji.Morocco, awayFlag: flagEmoji.Colombia,
    stadium: "Lincoln Financial Field", city: "Philadelphia", date: "2026-06-18", time: "19:00", dateObj: new Date("2026-06-18T19:00"),
    group: "Group H", stage: "Group Stage",
    ticketsAvailable: { vip: 90, regular: 550, economy: 1500 },
    prices: { vip: 620, regular: 280, economy: 105 },
    stadiumImage: "",
  },
  {
    id: "m9", homeTeam: "Canada", awayTeam: "Senegal", homeFlag: flagEmoji.Canada, awayFlag: flagEmoji.Senegal,
    stadium: "BC Place", city: "Vancouver", date: "2026-06-19", time: "20:00", dateObj: new Date("2026-06-19T20:00"),
    group: "Group A", stage: "Group Stage",
    ticketsAvailable: { vip: 140, regular: 850, economy: 2100 },
    prices: { vip: 580, regular: 260, economy: 95 },
    stadiumImage: "",
  },
  {
    id: "m10", homeTeam: "Argentina", awayTeam: "Brazil", homeFlag: flagEmoji.Argentina, awayFlag: flagEmoji.Brazil,
    stadium: "MetLife Stadium", city: "New York", date: "2026-07-15", time: "20:00", dateObj: new Date("2026-07-15T20:00"),
    group: "", stage: "Semi-Final",
    ticketsAvailable: { vip: 50, regular: 300, economy: 1000 },
    prices: { vip: 1500, regular: 750, economy: 350 },
    stadiumImage: "",
  },
  {
    id: "m11", homeTeam: "France", awayTeam: "Spain", homeFlag: flagEmoji.France, awayFlag: flagEmoji.Spain,
    stadium: "AT&T Stadium", city: "Dallas", date: "2026-07-16", time: "20:00", dateObj: new Date("2026-07-16T20:00"),
    group: "", stage: "Semi-Final",
    ticketsAvailable: { vip: 45, regular: 280, economy: 900 },
    prices: { vip: 1600, regular: 800, economy: 380 },
    stadiumImage: "",
  },
  {
    id: "m12", homeTeam: "TBD", awayTeam: "TBD", homeFlag: "🏆", awayFlag: "🏆",
    stadium: "MetLife Stadium", city: "New York", date: "2026-07-19", time: "18:00", dateObj: new Date("2026-07-19T18:00"),
    group: "", stage: "Final",
    ticketsAvailable: { vip: 30, regular: 200, economy: 800 },
    prices: { vip: 2500, regular: 1200, economy: 500 },
    stadiumImage: "",
  },
];

export const allTeams = [...new Set(matches.flatMap(m => [m.homeTeam, m.awayTeam]).filter(t => t !== "TBD"))].sort();
export const allStadiums = [...new Set(matches.map(m => m.stadium))].sort();
export const allStages = [...new Set(matches.map(m => m.stage))];

export function getMatch(id: string): Match | undefined {
  return matches.find(m => m.id === id);
}
