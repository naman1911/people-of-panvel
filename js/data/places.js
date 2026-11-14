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

/** Places you can jump between by share rickshaw. */
export const HUBS = [
  { id: 'talav', x: -338, z: -152, face: 0, en: 'Vadale Talav', mr: 'वडाळे तलाव', blurb: { en: 'The lake, the temple, the evening walkers', mr: 'तलाव, मंदिर आणि संध्याकाळची फेरी' } },
  { id: 'chowk', x: -290, z: 338, face: 3.1, en: 'Shivaji Chowk', mr: 'शिवाजी चौक', blurb: { en: 'Old town crossroads, bazaar a lane away', mr: 'जुन्या गावाचा चौक, बाजार हाकेच्या अंतरावर' } },
  { id: 'bazaar', x: -446, z: 548, face: 0, en: 'Bhaji Market', mr: 'भाजी मार्केट', blurb: { en: 'Vegetables, fish, and a lot of bargaining', mr: 'भाजी, मासळी आणि घासाघीस' } },
  { id: 'stand', x: 148, z: -84, face: 0, en: 'ST Stand', mr: 'एसटी स्टँड', blurb: { en: 'Red buses to the Konkan, vada pav while you wait', mr: 'कोकणच्या लाल पऱ्या आणि गरम वडापाव' } },
  { id: 'junction', x: 690, z: 62, face: 1.2, en: 'Panvel Junction', mr: 'पनवेल जंक्शन', blurb: { en: 'End of the Harbour line, gateway to the Konkan', mr: 'हार्बर लाईनचं शेवटचं स्टेशन, कोकणचं प्रवेशद्वार' } },
  { id: 'newpanvel', x: 430, z: -662, face: 2, en: 'New Panvel', mr: 'नवीन पनवेल', blurb: { en: 'CIDCO sectors, societies and khau galli', mr: 'सिडकोचे सेक्टर, सोसायट्या आणि खाऊ गल्ली' } },
];

/** Not built yet; listed so people know what is planned. */
export const FAR_PLACES = [
  { id: 'kharghar', en: 'Kharghar', mr: 'खारघर', mode: 'train', blurb: { en: 'Harbour line · Central Park, Pandavkada', mr: 'हार्बर लाईन · सेंट्रल पार्क, पांडवकडा' } },
  { id: 'karnala', en: 'Karnala', mr: 'कर्नाळा', mode: 'bus', blurb: { en: 'ST bus · bird sanctuary and the fort', mr: 'एसटी · पक्षी अभयारण्य आणि किल्ला' } },
];

/** Panvel Darshan: landmarks that stamp your card when you walk up to them. */
export const STAMPS = [
  {
    id: 'talav', x: -338, z: -160, r: 55, icon: '🌊', en: 'Vadale Talav', mr: 'वडाळे तलाव',
    fact: {
      en: 'The big lake at the heart of old Panvel. Maps label it Ballaleshwar Lake, after the temple on its western bank.',
      mr: 'जुन्या पनवेलच्या मध्यभागी असलेला मोठा तलाव. नकाशावर याला बल्लाळेश्वर तलाव म्हणतात; पश्चिम काठावर ते मंदिर आहे.',
    },
  },
  {
    id: 'mandir', x: -473, z: -205, r: 46, icon: '🛕', en: 'Ballaleshwar Mandir', mr: 'बल्लाळेश्वर मंदिर',
    fact: {
      en: 'The old temple beside the lake. Several smaller shrines stand around the same bank.',
      mr: 'तलावाकाठचं जुनं मंदिर. याच काठावर आणखी काही लहान देवळं आहेत.',
    },
  },
  {
    id: 'chowk', x: -284, z: 356, r: 40, icon: '🐎', en: 'Shivaji Chowk', mr: 'शिवाजी चौक',
    fact: {
      en: 'The statue of Chhatrapati Shivaji Maharaj marks the town’s best-known meeting point. “Chowkat bhetu” needs no further address.',
      mr: 'छत्रपती शिवाजी महाराजांचा पुतळा म्हणजे गावातलं भेटण्याचं ठरलेलं ठिकाण. “चौकात भेटू” एवढं म्हटलं की पुरे.',
    },
  },
  {
    id: 'palika', x: -737, z: 198, r: 50, icon: '🏛️', en: 'Nagar Palika, est. 1852', mr: 'नगरपालिका, स्थापना १८५२',
    fact: {
      en: 'Panvel’s municipal council was founded in 1852, the oldest in Maharashtra. It became a municipal corporation in 2016.',
      mr: 'पनवेल नगरपरिषदेची स्थापना १८५२ मध्ये झाली; ती महाराष्ट्रातली सर्वांत जुनी. २०१६ मध्ये तिची महानगरपालिका झाली.',
    },
  },
  {
    id: 'natyagruha', x: -475, z: 369, r: 48, icon: '🎭', en: 'Phadke Natyagruha', mr: 'फडके नाट्यगृह',
    fact: {
      en: 'The town auditorium is named after Vasudev Balwant Phadke, the revolutionary born in 1845 at Shirdhon, a village in Panvel taluka.',
      mr: 'नाट्यगृहाला आद्य क्रांतिवीर वासुदेव बळवंत फडके यांचं नाव आहे. त्यांचा जन्म १८४५ मध्ये पनवेल तालुक्यातल्या शिरढोण गावी झाला.',
    },
  },
  {
    id: 'krishnale', x: -512, z: 486, r: 46, icon: '🪷', en: 'Krishnale Talav', mr: 'कृष्णाळे तलाव',
    fact: {
      en: 'The second of old Panvel’s lakes, tucked behind the bazaar lanes.',
      mr: 'जुन्या पनवेलमधला दुसरा तलाव, बाजाराच्या गल्ल्यांमागे दडलेला.',
    },
  },
  {
    id: 'bhaji', x: -444, z: 542, r: 40, icon: '🥬', en: 'Bhaji Market', mr: 'भाजी मार्केट',
    fact: {
      en: 'Vegetables from nearby villages and fish from the creek-side koliwadas arrive here before most of the town is awake.',
      mr: 'आजूबाजूच्या गावांतली भाजी आणि खाडीकाठच्या कोळीवाड्यांतली मासळी, गाव जागं होण्याआधी इथे पोचते.',
    },
  },
  {
    id: 'synagogue', x: -440, z: 692, r: 40, icon: '🕯️', en: 'Beth El Synagogue', mr: 'बेथ एल सिनेगॉग',
    fact: {
      en: 'Built in the mid-1800s by the Bene Israel, the Marathi-speaking Jewish community of the Konkan.',
      mr: 'कोकणातल्या मराठी भाषक बेने इस्रायली समाजाने एकोणिसाव्या शतकाच्या मध्यात बांधलेलं प्रार्थनास्थळ.',
    },
  },
  {
    id: 'dargah', x: -521, z: 607, r: 34, icon: '🌙', en: 'Dargah Lane', mr: 'दर्गा गल्ली',
    fact: {
      en: 'A dargah, a Bohra mosque, a Shani temple and a synagogue all stand within a few minutes’ walk of each other here.',
      mr: 'दर्गा, बोहरा मशीद, शनी मंदिर आणि सिनेगॉग, सगळं काही मिनिटांच्या चालण्याच्या अंतरावर.',
    },
  },
  {
    id: 'israel', x: 68, z: 792, r: 50, icon: '💧', en: 'Israel Talav', mr: 'इस्रायल तलाव',
    fact: {
      en: 'One of the smaller lakes of the old town, on its southern edge.',
      mr: 'जुन्या गावाच्या दक्षिण टोकाचा एक लहान तलाव.',
    },
  },
  {
    id: 'stand', x: 152, z: -110, r: 62, icon: '🚌', en: 'ST Stand', mr: 'एसटी स्टँड',
    fact: {
      en: 'Maharashtra’s red state transport buses are fondly called Lal Pari, the red fairy. From here they fan out across Raigad and down the Konkan.',
      mr: 'एसटीच्या लाल गाडीला प्रेमाने “लाल परी” म्हणतात. इथून त्या रायगडभर आणि कोकणात जातात.',
    },
  },
  {
    id: 'junction', x: 705, z: 20, r: 75, icon: '🚆', en: 'Panvel Junction', mr: 'पनवेल जंक्शन',
    fact: {
      en: 'The last stop of Mumbai’s Harbour line, and a junction for trains towards the Konkan, Karjat and Diva.',
      mr: 'मुंबईच्या हार्बर लाईनचं शेवटचं स्थानक. इथून कोकण, कर्जत आणि दिव्याकडे गाड्या जातात.',
    },
  },
  {
    id: 'flyover', x: -59, z: -440, r: 50, icon: '🛣️', en: 'Under the Flyover', mr: 'उड्डाणपुलाखाली',
    fact: {
      en: 'The flyover lifts the old Mumbai–Pune highway over the town. The Mumbai–Goa highway, NH 66, also begins at Panvel.',
      mr: 'जुना मुंबई–पुणे महामार्ग या उड्डाणपुलावरून गावावरून जातो. मुंबई–गोवा महामार्ग (एनएच ६६) सुद्धा पनवेलहूनच सुरू होतो.',
    },
  },
  {
    id: 'orion', x: 116, z: -262, r: 55, icon: '🛍️', en: 'Orion Mall', mr: 'ओरायन मॉल',
    fact: {
      en: 'The mall next to the bus depot: air-conditioning, a multiplex, and half the town on a Sunday evening.',
      mr: 'डेपोशेजारचा मॉल. एसी, मल्टिप्लेक्स आणि रविवारी संध्याकाळी अर्धं पनवेल.',
    },
  },
  {
    id: 'hdfc', x: 422, z: -676, r: 44, icon: '🏘️', en: 'HDFC Circle', mr: 'एचडीएफसी सर्कल',
    fact: {
      en: 'New Panvel was planned by CIDCO as a node of Navi Mumbai. Addresses here go by sector number, and landmarks by whichever bank is on the corner.',
      mr: 'नवीन पनवेल हा सिडकोने आखलेला नवी मुंबईचा नोड. इथे पत्ता सेक्टरने सांगतात आणि खूण म्हणून कोपऱ्यावरची बँक.',
    },
  },
  {
    id: 'east', x: 856, z: -70, r: 50, icon: '🅿️', en: 'Station, East Side', mr: 'स्टेशन, पूर्व बाजू',
    fact: {
      en: 'The New Panvel side of the station: scooter parking, share rickshaws, and breakfast carts for the morning rush.',
      mr: 'स्टेशनची नवीन पनवेल बाजू. दुचाकी पार्किंग, शेअर रिक्षा आणि सकाळच्या गर्दीसाठी नाश्त्याच्या गाड्या.',
    },
  },
];

/** Where a new visitor first stands, and where the title screen looks. */
export const SPAWN = { x: -338, z: -150, face: 0 };
export const TITLE_SHOT = { cam: [-150, 62, -60], look: [-390, 0, -330] };
