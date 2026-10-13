export type ResultEntry = {
  school: string;
  department: string;
};

export type YearResult = {
  year: string;
  count: number;
  entries: ResultEntry[];
};

export const schoolUrls: Record<string, string> = {
  ベルリン芸術大学: 'https://www.udk-berlin.de/',
  'ベルリン・ヴァイセンゼー美術大学': 'https://kh-berlin.de/',
  ベルリン技術経済大学: 'https://www.htw-berlin.de/',
  ミュンヘン芸術大学: 'https://www.adbk.de/',
  ミュンヘン美術大学: 'https://www.adbk.de/',
  ハンブルク美術大学: 'https://www.hfbk-hamburg.de/',
  ハンブルク芸術大学: 'https://www.hfbk-hamburg.de/',
  ハンブルク応用科学大学: 'https://www.haw-hamburg.de/',
  ニュルンベルク美術大学: 'https://adbk-nuernberg.de/',
  ニュルンベルク芸術大学: 'https://adbk-nuernberg.de/',
  ブレーメン美術大学: 'https://www.hfk-bremen.de/',
  ブレーメン芸術大学: 'https://www.hfk-bremen.de/',
  ドレスデン美術大学: 'https://www.hfbk-dresden.de/',
  マインツ美術大学: 'https://kunsthochschule-mainz.de/',
  マインツ応用科学大学: 'https://www.hs-mainz.de/',
  'フランクフルト美術大学・シュテーデルシューレ': 'https://staedelschule.de/',
  カッセル芸術大学: 'https://kunsthochschulekassel.de/',
  カッセル大学: 'https://www.uni-kassel.de/',
  バウハウス大学ワイマール: 'https://www.uni-weimar.de/',
  'ワイマール・バウハウス大学': 'https://www.uni-weimar.de/',
  カールスルーエ芸術デザイン大学: 'https://hfg-karlsruhe.de/',
  カールスルーへ造形大学: 'https://hfg-karlsruhe.de/',
  カールスルーエ美術大学: 'https://www.kunstakademie-karlsruhe.de/',
  ヴッパタール大学: 'https://www.uni-wuppertal.de/',
  ミュンスター芸術大学: 'https://www.kunstakademie-muenster.de/',
  ミュンスター美術大学: 'https://www.kunstakademie-muenster.de/',
  ミュンスター専門大学: 'https://www.fh-muenster.de/',
  'MSD/ミュンスタースクールオブデザイン': 'https://www.fh-muenster.de/msd/',
  ビーレフェルト専門大学: 'https://www.hsbi.de/',
  ドルトムント応用科学大学: 'https://www.fh-dortmund.de/',
  ケルンインターナショナルスクールオブデザイン: 'https://kisd.de/',
  'キール・ムテジウス美術大学': 'https://muthesius-kunsthochschule.de/',
  'ブルク・ギービヒェンシュタイン芸術デザイン大学ハレ': 'https://www.burg-halle.de/',
  ライプツィヒ版画製本芸術大学: 'https://www.hgb-leipzig.de/',
  ブラウンシュバイク美術大学: 'https://www.hbk-bs.de/',
  ポツダム専門大学: 'https://www.fh-potsdam.de/',
  マグデブルク大学: 'https://www.ovgu.de/',
  シュトゥットガルト美術大学: 'https://www.abk-stuttgart.de/',
  ザールブリュッケン芸術大学: 'https://www.hbksaar.de/',
  アーヘン応用科学大学: 'https://www.fh-aachen.de/',
  ヴィスマール大学: 'https://www.hs-wismar.de/',
  'オーストリア・ウィーン応用美術大学': 'https://www.dieangewandte.at/',
  'オーストリア・ウィーン芸術大学': 'https://www.akbild.ac.at/',
  'オーストリア・ウィーン美術大学': 'https://www.akbild.ac.at/',
  'オーストリア・リンツ工科造形芸術大学': 'https://www.kunstuni-linz.at/',
  'オーストリア・リンツ芸術産業デザイン大学': 'https://www.kunstuni-linz.at/',
  'スペイン・バルセロナ ヨーロッパデザイン学院': 'https://www.ied.edu/barcelona',
};

export const resultsData: YearResult[] = [
  {
    year: '2025年度',
    count: 9,
    entries: [
      { school: 'ベルリン芸術大学', department: 'Visuelle Kommunikation' },
      { school: 'ミュンヘン芸術大学', department: 'Freie Kunst: Bildhauerei' },
      { school: 'ハンブルク美術大学', department: 'Bildende Künste: Bildhauerei' },
      { school: 'ハンブルク美術大学', department: 'Design' },
      { school: 'ニュルンベルク美術大学', department: 'Freie Kunst: Malerei' },
      { school: 'ブレーメン美術大学', department: 'Freie Kunst: Malerei' },
      { school: 'ドレスデン美術大学', department: 'Bildende Kunst: Malerei' },
      { school: 'マインツ美術大学', department: 'Freie Bildende Kunst: Malerei' },
      { school: 'マインツ応用科学大学', department: 'Kommunikationsdesign' },
    ],
  },
  {
    year: '2024年度',
    count: 13,
    entries: [
      {
        school: 'ベルリン・ヴァイセンゼー美術大学',
        department: 'Textil- und Material-Design',
      },
      { school: 'ベルリン技術経済大学', department: 'Kommunikationsdesign' },
      { school: 'ミュンヘン芸術大学', department: 'Freie Kunst: Malerei' },
      {
        school: 'オーストリア・ウィーン応用美術大学',
        department: 'Bildende Kunst: Malerei',
      },
      { school: 'ハンブルク美術大学', department: 'Design' },
      {
        school: 'フランクフルト美術大学・シュテーデルシューレ',
        department: 'Freie Bildende Kunst: Bildhauerei',
      },
      { school: 'ブレーメン美術大学', department: 'Integriertes Design' },
      { school: 'マインツ応用科学大学', department: 'Kommunikationsdesign' },
      { school: 'ビーレフェルト専門大学', department: 'Kommunikationsdesign' },
      { school: 'カッセル芸術大学', department: 'Visuelle Kommunikation' },
      { school: 'バウハウス大学ワイマール', department: 'Visuelle Kommunikation' },
      { school: 'カールスルーエ芸術デザイン大学', department: 'Kommunikationsdesign' },
      { school: 'ヴッパタール大学', department: 'Public Interest Design（大学院）' },
    ],
  },
  {
    year: '2023年度',
    count: 10,
    entries: [
      {
        school: 'ベルリン・ヴァイセンゼー美術大学',
        department: 'Freie Kunst: Malerei',
      },
      { school: 'ハンブルク美術大学', department: 'Bildende Künste: Bildhauerei' },
      { school: 'ハンブルク美術大学', department: 'Bildende Künste: Malerei' },
      { school: 'ミュンスター芸術大学', department: 'Freie Kunst: Bildhauerei' },
      { school: 'ミュンスター芸術大学', department: 'Freie Kunst: Malerei' },
      { school: 'ドルトムント応用科学大学', department: 'Kommunikationsdesign' },
      {
        school: 'オーストリア・リンツ工科造形芸術大学',
        department: 'Bildende Kunst（2名）',
      },
      {
        school: 'オーストリア・リンツ工科造形芸術大学',
        department: 'Grafik-Design und Fotografie',
      },
      {
        school: 'オーストリア・リンツ工科造形芸術大学',
        department: 'Architektur',
      },
    ],
  },
  {
    year: '2022年度',
    count: 10,
    entries: [
      {
        school: 'ハンブルク美術大学',
        department: 'Bildende Künste: Malerei/Zeichnen',
      },
      { school: 'ミュンヘン芸術大学', department: 'Freie Kunst: Bildhauerei' },
      { school: 'オーストリア・ウィーン芸術大学', department: 'Bildende Kunst' },
      { school: 'バウハウス大学ワイマール', department: 'Visuelle Kommunikation' },
      { school: 'ブレーメン美術大学', department: 'Integriertes Design' },
      {
        school: 'マインツ応用科学大学',
        department: 'Kommunikationsdesign（2名）',
      },
      {
        school: 'ケルンインターナショナルスクールオブデザイン',
        department: 'Integrated Design',
      },
      {
        school: 'MSD/ミュンスタースクールオブデザイン',
        department: 'Kommunikationsdesign',
      },
      {
        school: 'オーストリア・リンツ工科造形芸術大学',
        department: 'Architektur',
      },
    ],
  },
  {
    year: '2021年度',
    count: 8,
    entries: [
      {
        school: 'ミュンヘン美術大学',
        department: 'Freie Kunst: Malerei und Grafik（2名）',
      },
      { school: 'バウハウス大学ワイマール', department: 'Visuelle Kommunikation' },
      {
        school: 'ブルク・ギービヒェンシュタイン芸術デザイン大学ハレ',
        department: 'Textile Künste',
      },
      {
        school: 'オーストリア・リンツ工科造形芸術大学',
        department: 'Bildende Kunst（2名）',
      },
      {
        school: 'ブレーメン美術大学',
        department: 'Freie Kunst（高学期からの入学）',
      },
      { school: 'ブレーメン美術大学', department: 'Integriertes Design' },
    ],
  },
  {
    year: '2020年度',
    count: 9,
    entries: [
      { school: 'ベルリン芸術大学', department: 'Kunst und Medien' },
      { school: 'ベルリン・ヴァイセンゼー美術大学', department: 'Bildhauerei' },
      { school: 'ベルリン技術経済大学', department: 'Kommunikationsdesign' },
      { school: 'ベルリン技術経済大学', department: 'Industrial Design' },
      { school: 'ハンブルク美術大学', department: 'Design' },
      { school: 'ミュンスター専門大学', department: 'Produktdesign' },
      {
        school: 'ライプツィヒ版画製本芸術大学',
        department: 'Buchkunst/Grafik-Design',
      },
      { school: 'キール・ムテジウス美術大学', department: 'Visuelle Kommunikation' },
      {
        school: 'ブルク・ギービヒェンシュタイン芸術デザイン大学ハレ',
        department: 'Malerei/Grafik',
      },
    ],
  },
  {
    year: '2019年度',
    count: 14,
    entries: [
      { school: 'ベルリン芸術大学', department: 'Lehramt Bildende Kunst' },
      { school: 'ベルリン芸術大学', department: 'Bildende Kunst（絵画）' },
      { school: 'ベルリン芸術大学', department: 'Visuelle Kommunikation' },
      {
        school: 'ベルリン・ヴァイセンゼー美術大学',
        department: 'Visuelle Kommunikation',
      },
      { school: 'ベルリン技術経済大学', department: 'Modedesign' },
      { school: 'ベルリン技術経済大学', department: 'Kommunikationsdesign' },
      { school: 'ベルリン技術経済大学', department: 'Produktdesign' },
      {
        school: 'ミュンスター芸術大学',
        department: 'Freie Kunst: Malerei（2名）',
      },
      { school: 'キール・ムテジウス美術大学', department: 'Raumstrategien' },
      { school: 'カールスルーへ造形大学', department: 'Medienkunst' },
      { school: 'ブレーメン芸術大学', department: 'Integriertes Design' },
      { school: 'ニュルンベルク芸術大学', department: 'Gold- und Silberschmieden' },
      { school: 'ポツダム専門大学', department: 'Visuelle Kommunikation' },
      { school: 'マグデブルク大学', department: 'Industrial Design' },
    ],
  },
  {
    year: '2018年度',
    count: 16,
    entries: [
      { school: 'ベルリン芸術大学', department: 'Lehramt Bildende Kunst' },
      {
        school: 'ベルリン・ヴァイセンゼー美術大学',
        department: 'Modedesign、Produktdesign、Bildhauerei',
      },
      { school: 'ベルリン技術経済大学', department: 'Modedesign' },
      {
        school: 'ミュンヘン美術大学',
        department: 'Freie Kunst: Malerei und Grafik',
      },
      {
        school: 'オーストリア・ウィーン美術大学',
        department: 'Bildende Kunst: Malerei',
      },
      {
        school: 'ブラウンシュバイク美術大学',
        department: 'Freie Kunst: Malerei',
      },
      { school: 'ミュンスター美術大学', department: 'Lehramt Bildende Kunst' },
      { school: 'ブレーメン美術大学', department: 'Freie Kunst（2名）' },
      {
        school: 'オーストリア・リンツ芸術産業デザイン大学',
        department: 'Zeitbasierte und Interaktive Medien（2名）',
      },
      { school: 'カッセル大学', department: 'プロダクトデザイン科' },
      { school: 'アーヘン応用科学大学', department: 'Produktdesign' },
      {
        school: 'ザールブリュッケン芸術大学',
        department: 'Freie Kunst: Malerei、Produktdesign',
      },
      { school: 'ヴィスマール大学', department: 'Produktdesign' },
    ],
  },
  {
    year: '2017年度',
    count: 17,
    entries: [
      {
        school: 'ベルリン芸術大学',
        department: 'Kunst und Medien、Lehramt Bildende Kunst',
      },
      {
        school: 'オーストリア・ウィーン美術大学',
        department: 'Bildende Kunst: Malerei',
      },
      {
        school: 'スペイン・バルセロナ ヨーロッパデザイン学院',
        department: 'Modedesign',
      },
      {
        school: 'ミュンヘン美術大学',
        department: 'Freie Kunst: Malerei und Grafik、Freie Kunst: Keramik und Glas',
      },
      {
        school: 'ブレーメン美術大学',
        department: 'Freie Kunst: Malerei（2名）',
      },
      {
        school: 'ワイマール・バウハウス大学',
        department: 'Freie Kunst: Malerei',
      },
      { school: 'ハンブルク応用科学大学', department: 'Kostümdesign' },
      { school: 'ハンブルク芸術大学', department: 'Design' },
      {
        school: 'ベルリン・ヴァイセンゼー美術大学',
        department: 'Modedesign、Produktdesign（2名）、Bühnen- und Kostümbild',
      },
      {
        school: 'ブルク・ギービヒェンシュタイン芸術デザイン大学ハレ',
        department: 'Modedesign、Industriedesign（2名）、Kommunikationsdesign',
      },
    ],
  },
  {
    year: '2016年度',
    count: 13,
    entries: [
      { school: 'ベルリン芸術大学', department: 'Bildende Kunst' },
      { school: 'ベルリン技術経済大学', department: 'Visuelle Kommunikation' },
      { school: 'ミュンヘン美術大学', department: 'Bildhauerei' },
      { school: 'ハンブルク美術大学', department: 'Freie Kunst: Malerei' },
      {
        school: 'シュトゥットガルト美術大学',
        department: 'Intermediales Gestalten',
      },
      { school: 'キール・ムテジウス美術大学', department: 'Kommunikationsdesign' },
      {
        school: 'ベルリン・ヴァイセンゼー美術大学',
        department: 'Textildesign、MA Raumstrategien、Visuelle Kommunikation',
      },
      {
        school: 'ブラウンシュバイク美術大学',
        department: 'Bildhauerei、Freie Kunst: Malerei',
      },
      {
        school: 'ブルク・ギービヒェンシュタイン芸術デザイン大学ハレ',
        department: 'Textildesign、Visuelle Kommunikation',
      },
    ],
  },
  {
    year: '2015年度',
    count: 4,
    entries: [
      {
        school: 'ミュンヘン美術大学',
        department: 'Freie Kunst 自由芸術・絵画科',
      },
      {
        school: 'ニュルンベルク美術大学',
        department: 'Freie Kunst 自由芸術・絵画科',
      },
      {
        school: 'カールスルーエ美術大学',
        department: 'Freie Kunst 自由芸術・絵画科',
      },
      {
        school: 'アーヘン応用科学大学',
        department: 'Produktdesign プロダクトデザイン科',
      },
    ],
  },
];
