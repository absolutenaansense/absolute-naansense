// Dine-in floor layout, per outlet. Each table has a unique `label` (used as the
// table key stored on dine-in orders). Edit freely — this is just display data.
// (Lives in the frontend because the DB Table.number column is integer-only and
//  can't hold labels like "B1"/"S-Stage". Migrate to DB columns later if needed.)

const mk = (...labels) => labels.map(label => ({ label }))

const RENUKOOT = [
  { name: 'Bar', tables: mk('B1', 'B2', 'B3', 'B4', 'B5', 'B6') },
  { name: 'Stage', tables: mk('S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S-Stage') },
  { name: 'Lobby', tables: mk('L14', 'L15', 'L16', 'L17', 'L18', 'L19', 'L20') },
  { name: 'PDR (Private Dining)', tables: mk('P21', 'P22', 'P23') },
  { name: 'Open Tables', tables: mk('24', '25', '26', '27', '28', '29', '30') },
]

const RENUSAGAR = [
  { name: 'Main Hall', tables: mk('L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'PDR') },
  { name: 'Side Hall', tables: mk('S11', 'S12', 'S14', 'S15', 'S16', 'S17', 'S18', 'S19') },
  { name: 'Mocktail', tables: mk('M20', 'M21', 'M22', 'M23', 'M24') },
  { name: 'Tents', tables: mk('T25', 'T26', 'T27') },
  { name: 'Other', tables: mk('29', '30', '31', '32', '33', '34', '35') },
]

const LAYOUTS = { renukoot: RENUKOOT, renusagar: RENUSAGAR }

// Floor sections for an outlet (defaults to Renukoot for unknown/missing outlet).
export const floorFor = (outlet) => LAYOUTS[outlet] || RENUKOOT
// Flat list of all tables (with their section name) for an outlet.
export const tablesFor = (outlet) => floorFor(outlet).flatMap(s => s.tables.map(t => ({ ...t, section: s.name })))

// Back-compat default exports (Renukoot).
export const FLOOR_SECTIONS = RENUKOOT
export const ALL_TABLES = tablesFor('renukoot')
