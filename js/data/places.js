// Real places in Panvel, positioned from OpenStreetMap. Coordinates are metres
// from the map origin (x east, z south). Facts are kept to things that are
// well documented; please correct them through a pull request if you know better.

/** Neighbourhood names shown on the station-board HUD. First match wins. */
export const ZONES = [
  { id: 'talav', en: 'Vadale Talav', mr: 'वडाळे तलाव', x: -345, z: -385, r: 300, area: { en: 'Old Panvel', mr: 'जुने पनवेल' } },
  { id: 'junction', en: 'Panvel Junction', mr: 'पनवेल जंक्शन', x: 720, z: 20, r: 270, area: { en: 'Central Railway', mr: 'मध्य रेल्वे' } },
  { id: 'stand', en: 'ST Stand', mr: 'एसटी स्टँड', x: 160, z: -160, r: 200, area: { en: 'Bus Depot Road', mr: 'डेपो रोड' } },
  { id: 'chowk', en: 'Shivaji Chowk', mr: 'शिवाजी चौक', x: -286, z: 330, r: 120, area: { en: 'Old Panvel', mr: 'जुने पनवेल' } },
  { id: 'bazaar', en: 'Bazaar Peth', mr: 'बाजार पेठ', x: -480, z: 500, r: 260, area: { en: 'Old Panvel', mr: 'जुने पनवेल' } },
  { id: 'palika', en: 'Nagar Palika', mr: 'नगरपालिका', x: -730, z: 190, r: 150, area: { en: 'Old Panvel', mr: 'जुने पनवेल' } },
  { id: 'mcch', en: 'MCCH Society', mr: 'एमसीसीएच सोसायटी', x: -60, z: 520, r: 230, area: { en: 'Panvel', mr: 'पनवेल' } },
  { id: 'newpanvel', en: 'New Panvel', mr: 'नवीन पनवेल', test: (x, z) => z < 1.085 * x - 865, area: { en: 'CIDCO Node', mr: 'सिडको नोड' } },
  { id: 'panvel', en: 'Panvel', mr: 'पनवेल', test: () => true, area: { en: 'Raigad District', mr: 'रायगड जिल्हा' } },
];

export function zoneAt(x, z) {
  for (const zn of ZONES) {
    if (zn.test ? zn.test(x, z) : Math.hypot(x - zn.x, z - zn.z) < zn.r) return zn;
  }
  return ZONES[ZONES.length - 1];
}

/** Rickshaw stands: places you can ride to from the map. */
export const HUBS = [
  { id: 'talav', x: -338, z: -152, face: 0, en: 'Vadale Talav', mr: 'वडाळे तलाव', blurb: { en: 'The lake, the temple, the evening walkers', mr: 'तलाव, मंदिर आणि संध्याकाळची फेरी' } },
  { id: 'chowk', x: -290, z: 338, face: 3.1, en: 'Shivaji Chowk', mr: 'शिवाजी चौक', blurb: { en: 'Old town crossroads, bazaar a lane away', mr: 'जुन्या गावाचा चौक, बाजार हाकेच्या अंतरावर' } },
  { id: 'bazaar', x: -446, z: 548, face: 0, en: 'Bhaji Market', mr: 'भाजी मार्केट', blurb: { en: 'Vegetables, fish, and a lot of bargaining', mr: 'भाजी, मासळी आणि घासाघीस' } },
  { id: 'stand', x: 148, z: -84, face: 0, en: 'ST Stand', mr: 'एसटी स्टँड', blurb: { en: 'Red buses to the Konkan, vada pav while you wait', mr: 'कोकणच्या लाल पऱ्या आणि गरम वडापाव' } },
  { id: 'junction', x: 690, z: 62, face: 1.2, en: 'Panvel Junction', mr: 'पनवेल जंक्शन', blurb: { en: 'End of the Harbour line, gateway to the Konkan', mr: 'हार्बर लाईनचं शेवटचं स्टेशन, कोकणचं प्रवेशद्वार' } },
  { id: 'newpanvel', x: 430, z: -662, face: 2, en: 'New Panvel', mr: 'नवीन पनवेल', blurb: { en: 'CIDCO sectors, societies and khau galli', mr: 'सिडकोचे सेक्टर, सोसायट्या आणि खाऊ गल्ली' } },
];

/** Where a new visitor first stands, and where the title screen looks. */
export const SPAWN = { x: -338, z: -150, face: 0 };
export const TITLE_SHOT = { cam: [-150, 62, -60], look: [-390, 0, -330] };
