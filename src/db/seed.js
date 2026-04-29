// 

require('dotenv').config();
const { pool } = require('../config/db');

const destinations = [
  {
    slug:        'volcanoes-np',
    name:        'Volcanoes National Park',
    description: 'Home to mountain gorillas and the Virunga volcanoes. One of the most iconic wildlife destinations in Africa. Gorilla trekking permits are required and limited to 8 people per group per day.',
    region:      'Northern Province',
    lon:         -1.4699,
    lat:         -1.4699,
    difficulty:  'Moderate–Strenuous',
    best_season: 'June–September, December–February',
    permit_required: true,
    permit_info: 'Gorilla trekking permit: USD 1,500/person via Rwanda Development Board (rwandatourism.com)',
    gear_list:   ['Waterproof hiking boots','Rain jacket','Long-sleeve shirt','Gardening gloves','Gaiters','1.5L water','Insect repellent'],
    image_url:   'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Mountain_gorilla_%28Gorilla_beringei_beringei%29.jpg/1280px-Mountain_gorilla_%28Gorilla_beringei_beringei%29.jpg',
    lon_actual:  29.5241,
    lat_actual:  -1.4699,
  },
  {
    slug:        'nyungwe-np',
    name:        'Nyungwe National Park',
    description: 'Rwanda\'s oldest rainforest with chimpanzee trekking and the famous 70-metre canopy walkway. Over 300 bird species recorded. The Congo Nile Trail passes through the western edge.',
    region:      'Southern/Western Province',
    difficulty:  'Moderate',
    best_season: 'June–September',
    permit_required: true,
    permit_info: 'Chimpanzee trekking: USD 100/person. Canopy walk: USD 60/person. Book via RDB.',
    gear_list:   ['Hiking boots','Rain poncho','Long trousers','Binoculars','Camera','Insect repellent','Sunscreen'],
    image_url:   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Nyungwe_forest_Rwanda.jpg/1280px-Nyungwe_forest_Rwanda.jpg',
    lon_actual:  29.2167,
    lat_actual:  -2.5167,
  },
  {
    slug:        'akagera-np',
    name:        'Akagera National Park',
    description: 'Rwanda\'s Big Five savanna park in the Eastern Province. Home to lions, elephants, hippos, buffaloes and rhinos. The park borders Tanzania along the Akagera river.',
    region:      'Eastern Province',
    difficulty:  'Easy (game drives)',
    best_season: 'June–September',
    permit_required: false,
    permit_info: 'Park entry: USD 40/person/day. Game drives arranged at park gate.',
    gear_list:   ['Sunscreen','Hat','Binoculars','Camera with zoom lens','Light jacket for early morning','Neutral-coloured clothing'],
    image_url:   'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Akagera_National_Park_Lion.jpg/1280px-Akagera_National_Park_Lion.jpg',
    lon_actual:  30.75,
    lat_actual:  -1.9167,
  },
  {
    slug:        'lake-kivu',
    name:        'Lake Kivu & Congo Nile Trail',
    description: 'A 227 km trail running the full length of Lake Kivu from Rusizi to Rubavu. Passes fishing villages, tea plantations and the Nyungwe buffer zone. Can be done by bike or on foot in sections.',
    region:      'Western Province',
    difficulty:  'Moderate–Strenuous (full trail)',
    best_season: 'June–September, December–January',
    permit_required: false,
    permit_info: 'No permit needed. Arrange accommodation in advance at guesthouses along the trail.',
    gear_list:   ['Mountain bike (optional)','Camping gear or guesthouse budget','Water filter','Trail snacks','Cycling helmet','First aid kit'],
    image_url:   'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Lake_Kivu.jpg/1280px-Lake_Kivu.jpg',
    lon_actual:  29.2167,
    lat_actual:  -2.0167,
  },
  {
    slug:        'gishwati-mukura-np',
    name:        'Gishwati-Mukura National Park',
    description: 'Rwanda\'s newest national park, gazetted in 2016. Home to chimpanzees, golden monkeys and diverse birdlife. The forest is being restored after significant deforestation — ecotourism directly supports reforestation.',
    region:      'Western Province',
    difficulty:  'Easy–Moderate',
    best_season: 'Year-round (dry season preferred)',
    permit_required: true,
    permit_info: 'Golden monkey and chimp trekking: USD 60/person. Contact RDB for permits.',
    gear_list:   ['Waterproof jacket','Sturdy shoes','Water','Insect repellent','Camera'],
    image_url:   'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Gishwati_Forest.jpg/800px-Gishwati_Forest.jpg',
    lon_actual:  29.3833,
    lat_actual:  -1.7167,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding destinations…');
    for (const d of destinations) {
      await client.query(`
        INSERT INTO destinations
          (slug, name, description, region, location, difficulty, best_season,
           permit_required, permit_info, gear_list, image_url)
        VALUES ($1,$2,$3,$4, ST_MakePoint($5,$6)::geography, $7,$8,$9,$10,$11,$12)
        ON CONFLICT (slug) DO UPDATE SET
          name=EXCLUDED.name, description=EXCLUDED.description,
          difficulty=EXCLUDED.difficulty, best_season=EXCLUDED.best_season,
          permit_info=EXCLUDED.permit_info, gear_list=EXCLUDED.gear_list
      `, [
        d.slug, d.name, d.description, d.region,
        d.lon_actual, d.lat_actual,
        d.difficulty, d.best_season,
        d.permit_required, d.permit_info,
        d.gear_list, d.image_url,
      ]);
      console.log(`  ✓ ${d.name}`);
    }
    console.log('Seed complete.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();